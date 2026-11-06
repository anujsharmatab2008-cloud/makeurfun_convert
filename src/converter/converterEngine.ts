import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import { parseGIF, decompressFrames } from 'gifuct-js';

export interface ConversionOptions {
  fps: 'auto' | 15 | 24 | 30 | 60;
  scale: 50 | 60 | 70 | 75 | 100 | 150 | 200 | number;
  quality: 'high' | 'balanced' | 'compact';
  loopCount: number; // 1 to 10
  playbackSpeed: number; // 0.5 to 2.0
  reverseMode: 'normal' | 'reverse' | 'pingpong';
  bgColor: 'dark' | 'white' | 'black';
  fitSquare?: boolean; // WhatsApp Sticker: 512x512 1:1 square with safe margins & <500KB size
}

export interface ConversionProgress {
  phase: 'parsing' | 'encoding' | 'muxing' | 'complete';
  percent: number;
  currentFrame?: number;
  totalFrames?: number;
  stageMessage: string;
}

export interface DecodedFrame {
  canvas: HTMLCanvasElement;
  delayMs: number; // milliseconds
}

export interface ConversionResult {
  blob: Blob;
  url: string;
  width: number;
  height: number;
  durationSeconds: number;
  totalFrames: number;
  fileSize: number;
  originalSize: number;
  savedPercentage: number;
}

// Ensure even dimension required by H.264
function makeEven(dim: number): number {
  const rounded = Math.round(dim);
  return rounded % 2 === 0 ? Math.max(2, rounded) : Math.max(2, rounded + 1);
}

// Quality to bitrate mapping based on resolution and framerate
// Tuned for WhatsApp sticker limit (< 500 KB) while keeping sharp visual quality
function calculateBitrate(
  width: number,
  height: number,
  fps: number,
  quality: 'high' | 'balanced' | 'compact',
  fitSquare?: boolean
): number {
  if (fitSquare) {
    // WhatsApp animated stickers require strict < 500 KB total file size.
    // 550 kbps produces an ultra-compact ~120 KB - 240 KB file size that sends instantly
    if (quality === 'compact') return 360_000;
    return 550_000;
  }
  const pixelsPerSec = width * height * fps;
  let multiplier = 0.20;
  if (quality === 'high') multiplier = 0.25;
  if (quality === 'compact') multiplier = 0.08;
  
  const calculated = Math.round(pixelsPerSec * multiplier);
  return Math.min(8_000_000, Math.max(400_000, calculated));
}

// Decode GIF frames using gifuct-js
export async function decodeGif(
  buffer: ArrayBuffer,
  bgColor: 'dark' | 'white' | 'black',
  onProgress?: (percent: number) => void
): Promise<{ frames: DecodedFrame[]; width: number; height: number }> {
  const parsedGif = parseGIF(buffer);
  const rawFrames = decompressFrames(parsedGif, true);

  if (!rawFrames || rawFrames.length === 0) {
    throw new Error('No valid frames detected in GIF file.');
  }

  const baseWidth = parsedGif.lsd.width;
  const baseHeight = parsedGif.lsd.height;

  // Composite canvas for disposal handling
  const compCanvas = document.createElement('canvas');
  compCanvas.width = baseWidth;
  compCanvas.height = baseHeight;
  const compCtx = compCanvas.getContext('2d', { willReadFrequently: true })!;

  // Backup canvas for restoration disposal
  const backupCanvas = document.createElement('canvas');
  backupCanvas.width = baseWidth;
  backupCanvas.height = baseHeight;
  const backupCtx = backupCanvas.getContext('2d', { willReadFrequently: true })!;

  const frames: DecodedFrame[] = [];
  const patchCanvas = document.createElement('canvas');
  const patchCtx = patchCanvas.getContext('2d')!;

  for (let i = 0; i < rawFrames.length; i++) {
    const raw = rawFrames[i];
    const { dims, patch, delay, disposalType } = raw;

    // Backup current state if disposal will be restore to previous
    if (disposalType === 3) {
      backupCtx.clearRect(0, 0, baseWidth, baseHeight);
      backupCtx.drawImage(compCanvas, 0, 0);
    }

    // Prepare patch
    patchCanvas.width = dims.width;
    patchCanvas.height = dims.height;
    const patchData = new ImageData(new Uint8ClampedArray(patch), dims.width, dims.height);
    patchCtx.putImageData(patchData, 0, 0);

    // Draw patch onto composition canvas
    compCtx.drawImage(patchCanvas, dims.left, dims.top);

    // Snapshot current frame onto dedicated canvas
    const frameCanvas = document.createElement('canvas');
    frameCanvas.width = baseWidth;
    frameCanvas.height = baseHeight;
    const frameCtx = frameCanvas.getContext('2d')!;

    // Fill background if any transparent areas
    if (bgColor === 'white') {
      frameCtx.fillStyle = '#FFFFFF';
      frameCtx.fillRect(0, 0, baseWidth, baseHeight);
    } else if (bgColor === 'black') {
      frameCtx.fillStyle = '#000000';
      frameCtx.fillRect(0, 0, baseWidth, baseHeight);
    } else {
      frameCtx.fillStyle = '#0F172A'; // Dark slate
      frameCtx.fillRect(0, 0, baseWidth, baseHeight);
    }

    frameCtx.drawImage(compCanvas, 0, 0);

    // Handle disposal for next iteration
    if (disposalType === 2) {
      // Clear current frame area to transparent
      compCtx.clearRect(dims.left, dims.top, dims.width, dims.height);
    } else if (disposalType === 3) {
      // Restore previous
      compCtx.clearRect(0, 0, baseWidth, baseHeight);
      compCtx.drawImage(backupCanvas, 0, 0);
    }

    // Normalize delay: 0 or <20ms is treated as 100ms standard browser behavior
    const normalizedDelay = delay < 20 ? 100 : delay;

    frames.push({
      canvas: frameCanvas,
      delayMs: normalizedDelay,
    });

    if (onProgress) {
      onProgress(Math.round(((i + 1) / rawFrames.length) * 100));
    }
  }

  return { frames, width: baseWidth, height: baseHeight };
}

// Decode WebP animation frames using modern browser ImageDecoder or image fallback
export async function decodeWebP(
  file: File,
  bgColor: 'dark' | 'white' | 'black',
  onProgress?: (percent: number) => void
): Promise<{ frames: DecodedFrame[]; width: number; height: number }> {
  const arrayBuffer = await file.arrayBuffer();

  // Try ImageDecoder API (Chromium, Edge, Safari 16.4+)
  if (typeof window !== 'undefined' && 'ImageDecoder' in window) {
    try {
      const decoder = new (window as any).ImageDecoder({
        data: arrayBuffer,
        type: 'image/webp',
      });

      await decoder.tracks.ready;
      const track = decoder.tracks.selectedTrack;
      const frameCount = track?.frameCount || 1;

      if (frameCount > 0) {
        const frames: DecodedFrame[] = [];
        let detectedWidth = 0;
        let detectedHeight = 0;

        for (let i = 0; i < frameCount; i++) {
          const { image: videoFrame, duration } = await decoder.decode({ frameIndex: i });
          detectedWidth = videoFrame.displayWidth || videoFrame.codedWidth;
          detectedHeight = videoFrame.displayHeight || videoFrame.codedHeight;

          const frameCanvas = document.createElement('canvas');
          frameCanvas.width = detectedWidth;
          frameCanvas.height = detectedHeight;
          const ctx = frameCanvas.getContext('2d')!;

          if (bgColor === 'white') {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, detectedWidth, detectedHeight);
          } else if (bgColor === 'black') {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, detectedWidth, detectedHeight);
          } else {
            ctx.fillStyle = '#0F172A';
            ctx.fillRect(0, 0, detectedWidth, detectedHeight);
          }

          ctx.drawImage(videoFrame, 0, 0);
          videoFrame.close();

          // Duration in ImageDecoder is in microseconds
          const delayMs = duration ? Math.max(20, Math.round(duration / 1000)) : 100;
          frames.push({ canvas: frameCanvas, delayMs });

          if (onProgress) {
            onProgress(Math.round(((i + 1) / frameCount) * 100));
          }
        }

        if (frames.length > 0 && detectedWidth > 0) {
          return { frames, width: detectedWidth, height: detectedHeight };
        }
      }
    } catch (e) {
      console.warn('ImageDecoder failed, falling back to standard Image loader:', e);
    }
  }

  // Fallback: standard static/animated WebP load
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const width = img.naturalWidth;
      const height = img.naturalHeight;

      const frameCanvas = document.createElement('canvas');
      frameCanvas.width = width;
      frameCanvas.height = height;
      const ctx = frameCanvas.getContext('2d')!;

      if (bgColor === 'white') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
      } else if (bgColor === 'black') {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);
      } else {
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(0, 0, width, height);
      }

      ctx.drawImage(img, 0, 0);

      // Create a 3-second sequence for static/unsplit image
      const frames: DecodedFrame[] = [{
        canvas: frameCanvas,
        delayMs: 3000,
      }];

      resolve({ frames, width, height });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load WebP file into image context.'));
    };
    img.src = url;
  });
}

// Convert animation frames into MP4
export async function convertToMp4(
  file: File,
  options: ConversionOptions,
  onProgress?: (progress: ConversionProgress) => void
): Promise<ConversionResult> {
  const isGif = file.name.toLowerCase().endsWith('.gif') || file.type === 'image/gif';
  
  onProgress?.({
    phase: 'parsing',
    percent: 5,
    stageMessage: `Parsing ${isGif ? 'GIF' : 'WebP'} animation frames...`,
  });

  let rawFrames: DecodedFrame[] = [];
  let sourceWidth = 0;
  let sourceHeight = 0;

  if (isGif) {
    const buffer = await file.arrayBuffer();
    const decoded = await decodeGif(buffer, options.bgColor, (pct) => {
      onProgress?.({
        phase: 'parsing',
        percent: 5 + Math.round(pct * 0.25), // 5% -> 30%
        stageMessage: `Decoding GIF frames (${pct}%)...`,
      });
    });
    rawFrames = decoded.frames;
    sourceWidth = decoded.width;
    sourceHeight = decoded.height;
  } else {
    const decoded = await decodeWebP(file, options.bgColor, (pct) => {
      onProgress?.({
        phase: 'parsing',
        percent: 5 + Math.round(pct * 0.25),
        stageMessage: `Decoding WebP frames (${pct}%)...`,
      });
    });
    rawFrames = decoded.frames;
    sourceWidth = decoded.width;
    sourceHeight = decoded.height;
  }

  if (rawFrames.length === 0) {
    throw new Error('No frames found in input file');
  }

  // Handle Reverse / Ping-pong
  let sequenceFrames: DecodedFrame[] = [...rawFrames];
  if (options.reverseMode === 'reverse') {
    sequenceFrames = [...rawFrames].reverse();
  } else if (options.reverseMode === 'pingpong' && rawFrames.length > 1) {
    const forward = [...rawFrames];
    const backward = [...rawFrames.slice(1, -1)].reverse();
    sequenceFrames = [...forward, ...backward];
  }

  // Handle Looping (repeating sequence)
  const loopCount = Math.max(1, Math.min(10, options.loopCount));
  let loopedSequence: DecodedFrame[] = [];
  for (let l = 0; l < loopCount; l++) {
    loopedSequence = loopedSequence.concat(sequenceFrames);
  }

  // Apply playback speed modifier to frame delays
  const speed = Math.max(0.25, Math.min(4.0, options.playbackSpeed));
  const finalFrames = loopedSequence.map((f) => ({
    canvas: f.canvas,
    delayMs: Math.max(16, Math.round(f.delayMs / speed)),
  }));

  // WhatsApp Sticker mode (default: true) creates a 512x512 square canvas
  // with a 440px safe content box (36px margin) so WhatsApp's rounded square sticker frame never clips heads or edges!
  const isFitSquare = options.fitSquare !== false;

  let targetWidth: number;
  let targetHeight: number;
  let drawX: number;
  let drawY: number;
  let drawWidth: number;
  let drawHeight: number;

  if (isFitSquare) {
    targetWidth = 512;
    targetHeight = 512;
    const safeZone = 440;
    const scaleRatio = Math.min(safeZone / sourceWidth, safeZone / sourceHeight);
    drawWidth = makeEven(sourceWidth * scaleRatio);
    drawHeight = makeEven(sourceHeight * scaleRatio);
    drawX = Math.round((targetWidth - drawWidth) / 2);
    drawY = Math.round((targetHeight - drawHeight) / 2);
  } else {
    const scaleFactor = (options.scale || 100) / 100;
    targetWidth = makeEven(sourceWidth * scaleFactor);
    targetHeight = makeEven(sourceHeight * scaleFactor);
    drawWidth = targetWidth;
    drawHeight = targetHeight;
    drawX = 0;
    drawY = 0;
  }

  const bgHex = options.bgColor === 'white' ? '#FFFFFF' : options.bgColor === 'black' ? '#000000' : '#0F172A';
  const drawRect = { x: drawX, y: drawY, w: drawWidth, h: drawHeight, bgHex };

  // Determine framerate: enforce smooth 30 fps minimum (or user choice 60 / 24 / 15)
  let targetFps = 30;
  if (options.fps !== 'auto') {
    targetFps = options.fps;
  } else {
    // Auto mode: calculate native rate, but ensure at least 30 fps for smooth video playback
    const totalOriginalDurationMs = rawFrames.reduce((acc, f) => acc + f.delayMs, 0);
    const avgDelay = totalOriginalDurationMs / Math.max(1, rawFrames.length);
    const detectedFps = Math.round(1000 / avgDelay);
    targetFps = Math.max(30, Math.min(60, detectedFps || 30));
  }

  onProgress?.({
    phase: 'encoding',
    percent: 32,
    stageMessage: `Encoding WhatsApp sticker MP4 (${targetWidth}x${targetHeight} @ ${targetFps}fps)...`,
  });

  // Calculate duration
  const totalDurationMs = finalFrames.reduce((acc, f) => acc + f.delayMs, 0);
  const durationSeconds = totalDurationMs / 1000;

  // Render canvas with scaled dimensions
  const renderCanvas = document.createElement('canvas');
  renderCanvas.width = targetWidth;
  renderCanvas.height = targetHeight;
  const renderCtx = renderCanvas.getContext('2d')!;

  // Primary encoding method: WebCodecs VideoEncoder + mp4-muxer
  const hasWebCodecs = typeof window !== 'undefined' && 'VideoEncoder' in window && 'VideoFrame' in window;

  if (hasWebCodecs) {
    try {
      const result = await encodeWithWebCodecs(
        finalFrames,
        renderCanvas,
        renderCtx,
        targetWidth,
        targetHeight,
        targetFps,
        options.quality,
        drawRect,
        isFitSquare,
        onProgress
      );

      const savedBytes = file.size - result.blob.size;
      const savedPercentage = Math.round((savedBytes / file.size) * 100);

      return {
        blob: result.blob,
        url: URL.createObjectURL(result.blob),
        width: targetWidth,
        height: targetHeight,
        durationSeconds: Number(durationSeconds.toFixed(2)),
        totalFrames: result.totalEncodedFrames,
        fileSize: result.blob.size,
        originalSize: file.size,
        savedPercentage,
      };
    } catch (err) {
      console.warn('WebCodecs encoding encountered error, trying MediaRecorder fallback:', err);
    }
  }

  // Fallback: MediaRecorder Canvas Stream
  const fallbackResult = await encodeWithMediaRecorder(
    finalFrames,
    renderCanvas,
    renderCtx,
    targetWidth,
    targetHeight,
    targetFps,
    drawRect,
    onProgress
  );

  const savedBytes = file.size - fallbackResult.blob.size;
  const savedPercentage = Math.round((savedBytes / file.size) * 100);

  return {
    blob: fallbackResult.blob,
    url: URL.createObjectURL(fallbackResult.blob),
    width: targetWidth,
    height: targetHeight,
    durationSeconds: Number(durationSeconds.toFixed(2)),
    totalFrames: fallbackResult.totalEncodedFrames,
    fileSize: fallbackResult.blob.size,
    originalSize: file.size,
    savedPercentage,
  };
}

// WebCodecs + mp4-muxer implementation with Constant Frame Rate (CFR) resampling
async function encodeWithWebCodecs(
  frames: DecodedFrame[],
  renderCanvas: HTMLCanvasElement,
  renderCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  fps: number,
  quality: 'high' | 'balanced' | 'compact',
  drawRect: { x: number; y: number; w: number; h: number; bgHex: string },
  isFitSquare: boolean,
  onProgress?: (progress: ConversionProgress) => void
): Promise<{ blob: Blob; totalEncodedFrames: number }> {
  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: {
      codec: 'avc',
      width,
      height,
    },
    fastStart: 'in-memory',
    firstTimestampBehavior: 'offset',
  });

  const bitrate = calculateBitrate(width, height, fps, quality, isFitSquare);

// Helper to construct standard AVCDecoderConfigurationRecord (avcC box)
// Windows Media Player (Films & TV) error 0xC00D5212 occurs if avcC is missing or malformed
function ensureAvcCDecoderConfig(
  chunk: EncodedVideoChunk,
  meta?: EncodedVideoChunkMetadata
): EncodedVideoChunkMetadata {
  if (meta?.decoderConfig?.description && (meta.decoderConfig.description as any).byteLength > 0) {
    return meta;
  }

  // If description is missing from browser metadata, extract SPS and PPS from keyframe chunk
  if (chunk.type === 'key') {
    const chunkData = new Uint8Array(chunk.byteLength);
    chunk.copyTo(chunkData);

    let sps: Uint8Array | null = null;
    let pps: Uint8Array | null = null;

    let offset = 0;
    while (offset + 4 < chunkData.length) {
      // 4-byte length prefix (AVC format)
      const nalLength =
        (chunkData[offset] << 24) |
        (chunkData[offset + 1] << 16) |
        (chunkData[offset + 2] << 8) |
        chunkData[offset + 3];

      if (nalLength > 0 && offset + 4 + nalLength <= chunkData.length) {
        const nalType = chunkData[offset + 4] & 0x1f;
        if (nalType === 7 && !sps) {
          sps = chunkData.slice(offset + 4, offset + 4 + nalLength);
        } else if (nalType === 8 && !pps) {
          pps = chunkData.slice(offset + 4, offset + 4 + nalLength);
        }
        offset += 4 + nalLength;
        continue;
      }

      // Annex-B start codes (00 00 00 01 or 00 00 01)
      if (chunkData[offset] === 0 && chunkData[offset + 1] === 0) {
        let prefixLen = 0;
        if (chunkData[offset + 2] === 1) prefixLen = 3;
        else if (chunkData[offset + 2] === 0 && chunkData[offset + 3] === 1) prefixLen = 4;

        if (prefixLen > 0) {
          const nalStart = offset + prefixLen;
          let nextStart = chunkData.length;
          for (let i = nalStart; i + 3 < chunkData.length; i++) {
            if (
              chunkData[i] === 0 &&
              chunkData[i + 1] === 0 &&
              (chunkData[i + 2] === 1 || (chunkData[i + 2] === 0 && chunkData[i + 3] === 1))
            ) {
              nextStart = i;
              break;
            }
          }
          const nalType = chunkData[nalStart] & 0x1f;
          if (nalType === 7 && !sps) {
            sps = chunkData.slice(nalStart, nextStart);
          } else if (nalType === 8 && !pps) {
            pps = chunkData.slice(nalStart, nextStart);
          }
          offset = nextStart;
          continue;
        }
      }
      offset++;
    }

    if (sps && pps) {
      // Build ISO/IEC 14496-15 AVCDecoderConfigurationRecord
      const record = new Uint8Array(11 + sps.length + pps.length);
      record[0] = 1; // configurationVersion
      record[1] = sps[1]; // AVCProfileIndication
      record[2] = sps[2]; // profile_compatibility
      record[3] = sps[3]; // AVCLevelIndication
      record[4] = 0xff; // lengthSizeMinusOne = 3 (4-byte NAL length prefix)
      record[5] = 0xe1; // numOfSequenceParameterSets = 1
      record[6] = (sps.length >> 8) & 0xff;
      record[7] = sps.length & 0xff;
      record.set(sps, 8);
      const ppsOffset = 8 + sps.length;
      record[ppsOffset] = 1; // numOfPictureParameterSets = 1
      record[ppsOffset + 1] = (pps.length >> 8) & 0xff;
      record[ppsOffset + 2] = pps.length & 0xff;
      record.set(pps, ppsOffset + 3);

      return {
        ...meta,
        decoderConfig: {
          codec: 'avc1.42E01E',
          description: record,
        },
      };
    }
  }

  return meta || {};
}

// AVC / H.264 Constrained Baseline Profile (avc1.42E01E)
// 0x42 = Baseline, 0xE0 = Constrained (universally supported by Windows Media Player, QuickTime, iOS, Android)
let codecString = 'avc1.42E01E';
try {
  const isSupported = await VideoEncoder.isConfigSupported({
    codec: codecString,
    width,
    height,
    bitrate,
    framerate: fps,
    avc: { format: 'avc' },
  });
  if (!isSupported.supported) {
    codecString = 'avc1.42E01F';
  }
} catch {
  codecString = 'avc1.42E01E';
}

let encoderError: Error | null = null;
const videoEncoder = new VideoEncoder({
  output: (chunk, meta) => {
    try {
      const verifiedMeta = ensureAvcCDecoderConfig(chunk, meta);
      muxer.addVideoChunk(chunk, verifiedMeta);
    } catch (err: any) {
      encoderError = err;
      console.error('Muxer addVideoChunk error:', err);
    }
  },
  error: (e) => {
    encoderError = e;
    console.error('VideoEncoder error:', e);
  },
});

await videoEncoder.configure({
  codec: codecString,
  width,
  height,
  bitrate,
  framerate: fps,
  avc: { format: 'avc' }, // Explicitly request MP4 AVC format with avcC description
  latencyMode: 'quality', // Full motion search for fluid video
});

  // 1. Build cumulative animation timeline for exact Constant Frame Rate sampling
  interface TimelineEntry {
    canvas: HTMLCanvasElement;
    startMs: number;
    endMs: number;
  }

  let cumulativeMs = 0;
  const timeline: TimelineEntry[] = frames.map((f) => {
    const startMs = cumulativeMs;
    cumulativeMs += f.delayMs;
    return {
      canvas: f.canvas,
      startMs,
      endMs: cumulativeMs,
    };
  });

  const totalDurationMs = Math.max(100, cumulativeMs);
  const totalVideoFrames = Math.max(1, Math.round((totalDurationMs / 1000) * fps));
  const frameIntervalUs = Math.round(1_000_000 / fps);

  const getCanvasForTime = (timeMs: number): HTMLCanvasElement => {
    for (let j = 0; j < timeline.length; j++) {
      if (timeMs >= timeline[j].startMs && timeMs < timeline[j].endMs) {
        return timeline[j].canvas;
      }
    }
    return timeline[timeline.length - 1].canvas;
  };

  // 2. Uniform CFR frame encode loop
  for (let k = 0; k < totalVideoFrames; k++) {
    if (encoderError) throw encoderError;

    const currentTimeMs = (k / fps) * 1000;
    const activeCanvas = getCanvasForTime(currentTimeMs);

    // Fill background solid color and draw centered within safe zone
    renderCtx.fillStyle = drawRect.bgHex;
    renderCtx.fillRect(0, 0, width, height);
    renderCtx.drawImage(activeCanvas, drawRect.x, drawRect.y, drawRect.w, drawRect.h);

    const timestampUs = Math.round((k * 1_000_000) / fps);

    const videoFrame = new VideoFrame(renderCanvas, {
      timestamp: timestampUs,
      duration: frameIntervalUs,
    });

    // Keyframe at start and every 1 second for instant seeking
    const isKeyframe = k === 0 || k % fps === 0;
    videoEncoder.encode(videoFrame, { keyFrame: isKeyframe });
    videoFrame.close();

    // Progress updates
    if (k % 4 === 0 || k === totalVideoFrames - 1) {
      const percent = 35 + Math.round(((k + 1) / totalVideoFrames) * 60); // 35% -> 95%
      onProgress?.({
        phase: 'encoding',
        percent,
        currentFrame: k + 1,
        totalFrames: totalVideoFrames,
        stageMessage: `Encoding smooth video frame ${k + 1} of ${totalVideoFrames} (${percent}%)...`,
      });
      // Yield to main thread
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  onProgress?.({
    phase: 'muxing',
    percent: 96,
    stageMessage: 'Finalizing MP4 container and fast-start headers...',
  });

  await videoEncoder.flush();
  if (encoderError) throw encoderError;
  muxer.finalize();

  const mp4Blob = new Blob([target.buffer], { type: 'video/mp4' });

  onProgress?.({
    phase: 'complete',
    percent: 100,
    stageMessage: 'Conversion completed successfully!',
  });

  return { blob: mp4Blob, totalEncodedFrames: totalVideoFrames };
}

// MediaRecorder fallback implementation with CFR sampling
async function encodeWithMediaRecorder(
  frames: DecodedFrame[],
  renderCanvas: HTMLCanvasElement,
  renderCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  fps: number,
  drawRect: { x: number; y: number; w: number; h: number; bgHex: string },
  onProgress?: (progress: ConversionProgress) => void
): Promise<{ blob: Blob; totalEncodedFrames: number }> {
  let mimeType = 'video/mp4; codecs="avc1.42E01E"';
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/mp4';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm; codecs=vp9';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }
    }
  }

  const stream = renderCanvas.captureStream(fps);
  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks: Blob[] = [];

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  let cumulativeMs = 0;
  const timeline = frames.map((f) => {
    const startMs = cumulativeMs;
    cumulativeMs += f.delayMs;
    return { canvas: f.canvas, startMs, endMs: cumulativeMs };
  });

  const totalDurationMs = Math.max(100, cumulativeMs);
  const totalVideoFrames = Math.max(1, Math.round((totalDurationMs / 1000) * fps));
  const frameIntervalMs = 1000 / fps;

  const getCanvasForTime = (timeMs: number): HTMLCanvasElement => {
    for (let j = 0; j < timeline.length; j++) {
      if (timeMs >= timeline[j].startMs && timeMs < timeline[j].endMs) {
        return timeline[j].canvas;
      }
    }
    return timeline[timeline.length - 1].canvas;
  };

  return new Promise(async (resolve, reject) => {
    recorder.onstop = () => {
      const outputType = mimeType.includes('mp4') ? 'video/mp4' : mimeType;
      const finalBlob = new Blob(chunks, { type: outputType });
      onProgress?.({
        phase: 'complete',
        percent: 100,
        stageMessage: 'Conversion complete!',
      });
      resolve({ blob: finalBlob, totalEncodedFrames: totalVideoFrames });
    };

    recorder.onerror = (e) => reject(e);

    recorder.start(100);

    for (let k = 0; k < totalVideoFrames; k++) {
      const currentTimeMs = k * frameIntervalMs;
      const activeCanvas = getCanvasForTime(currentTimeMs);

      renderCtx.fillStyle = drawRect.bgHex;
      renderCtx.fillRect(0, 0, width, height);
      renderCtx.drawImage(activeCanvas, drawRect.x, drawRect.y, drawRect.w, drawRect.h);

      const percent = 35 + Math.round(((k + 1) / totalVideoFrames) * 60);
      onProgress?.({
        phase: 'encoding',
        percent,
        currentFrame: k + 1,
        totalFrames: totalVideoFrames,
        stageMessage: `Recording frame ${k + 1} of ${totalVideoFrames}...`,
      });

      await new Promise((r) => setTimeout(r, frameIntervalMs));
    }

    recorder.stop();
  });
}
