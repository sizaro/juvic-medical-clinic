import { Camera, CameraIcon, FileUp, Image as ImageIcon, Loader2, RefreshCw, SwitchCamera, Trash2, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { uploadService, type UploadedAsset } from '../services/uploadService';

type Props = {
  label: string;
  folder: string;
  value?: UploadedAsset | null;
  onChange: (asset: UploadedAsset | null) => void;
  allowPdf?: boolean;
};

export default function DocumentUploader({ label, folder, value, onChange, allowPdf = true }: Props) {
  const chooseRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [selected, setSelected] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [captured, setCaptured] = useState<File | null>(null);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      void videoRef.current.play().catch(() => undefined);
    }
  }, [stream]);

  useEffect(() => () => {
    stream?.getTracks().forEach(track => track.stop());
    if (preview) URL.revokeObjectURL(preview);
    if (capturedPreview) URL.revokeObjectURL(capturedPreview);
  }, [stream, preview, capturedPreview]);

  const stopCamera = () => {
    stream?.getTracks().forEach(track => track.stop());
    setStream(null);
  };

  const closeCamera = () => {
    stopCamera();
    setCameraOpen(false);
    setCameraStarting(false);
    setCaptured(null);
    if (capturedPreview) URL.revokeObjectURL(capturedPreview);
    setCapturedPreview(null);
    setCameraError('');
  };

  const openCamera = async (mode: 'environment' | 'user' = facingMode) => {
    setCameraOpen(true);
    setCameraStarting(true);
    stopCamera();
    setCaptured(null);
    if (capturedPreview) URL.revokeObjectURL(capturedPreview);
    setCapturedPreview(null);
    setCameraError('');
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera access is unavailable in this browser.');
      const next = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: mode } }, audio: false });
      setFacingMode(mode);
      setStream(next);
    } catch {
      setCameraError('Camera access failed. Allow camera permission, then try again. Camera access requires HTTPS or localhost.');
    } finally {
      setCameraStarting(false);
    }
  };

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setCameraError('The camera is still starting. Wait a moment and capture again.');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
      if (!blob) return;
      const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
      setCaptured(file);
      setCapturedPreview(URL.createObjectURL(file));
      stopCamera();
    }, 'image/jpeg', 0.9);
  };

  const pick = (file?: File) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('The file cannot exceed 10 MB.'); return; }
    setSelected(file);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(file.type.startsWith('image/') ? URL.createObjectURL(file) : null);
  };

  const useCaptured = () => {
    if (!captured) return;
    pick(captured);
    closeCamera();
  };

  const upload = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const asset = await uploadService.upload(selected, folder);
      onChange(asset);
      setSelected(null);
      if (preview) URL.revokeObjectURL(preview);
      setPreview(null);
      toast.success('File compressed and uploaded securely.');
    } catch (e: any) {
      toast.error(e.response?.data?.message ?? e.message ?? 'Upload failed.');
    } finally { setBusy(false); }
  };

  const clear = () => {
    setSelected(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    onChange(null);
  };

  return <div className="rounded-xl border border-dashed bg-slate-50 p-3">
    <p className="text-sm font-semibold">{label}</p>
    <input ref={chooseRef} hidden type="file" accept={allowPdf ? 'image/*,application/pdf' : 'image/*'} onChange={e => pick(e.target.files?.[0])}/>
    <div className="mt-2 flex flex-wrap gap-2">
      <button type="button" className="rounded-lg border bg-white px-3 py-2 text-sm" onClick={() => chooseRef.current?.click()}><FileUp className="mr-1 inline" size={16}/>Choose file</button>
      <button type="button" className="rounded-lg border bg-white px-3 py-2 text-sm" onClick={() => void openCamera()}><Camera className="mr-1 inline" size={16}/>Open camera</button>
      {selected && <button type="button" className="btn-primary px-3 py-2 text-sm" disabled={busy} onClick={upload}>{busy ? <Loader2 className="mr-1 inline animate-spin" size={16}/> : <Upload className="mr-1 inline" size={16}/>}Use and upload</button>}
      {(selected || value) && <button type="button" className="rounded-lg border px-3 py-2 text-sm text-red-600" onClick={clear}><Trash2 className="mr-1 inline" size={16}/>Remove</button>}
    </div>
    {preview && <div className="mt-3"><img src={preview} className="max-h-48 rounded-lg object-contain" alt="Selected preview"/><p className="mt-1 text-xs text-amber-700">Review the image, then choose “Use and upload”.</p></div>}
    {selected && !preview && <p className="mt-2 text-sm text-slate-600">Selected: {selected.name}</p>}
    {value && <div className="mt-3 flex items-center gap-2 text-sm text-emerald-700">{value.mimeType.startsWith('image/') ? <img src={value.url} className="h-16 w-16 rounded-lg object-cover" alt="Uploaded"/> : <ImageIcon/>}<a href={value.url} target="_blank" rel="noreferrer" className="underline">Uploaded: {value.originalName}</a></div>}

    {cameraOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/85 p-4"><section className="w-full max-w-2xl rounded-2xl bg-white p-4 shadow-2xl">
      <div className="mb-3 flex items-center justify-between"><div><h3 className="font-bold">{captured ? `Review ${label.toLowerCase()}` : `Take ${label.toLowerCase()}`}</h3><p className="text-xs text-slate-500">The photo is not uploaded until you accept it.</p></div><button type="button" aria-label="Close camera" className="rounded-lg p-2 hover:bg-slate-100" onClick={closeCamera}><X size={20}/></button></div>
      {cameraStarting ? <div className="flex min-h-64 flex-col items-center justify-center rounded-xl bg-slate-950 text-white"><Loader2 className="mb-3 animate-spin" size={30}/><p className="font-semibold">Requesting camera access…</p><p className="mt-1 text-xs text-slate-300">Approve the camera permission shown by your browser.</p></div> : cameraError ? <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{cameraError}</div> : capturedPreview ? <img src={capturedPreview} alt="Captured review" className="max-h-[60vh] w-full rounded-xl bg-black object-contain"/> : <video ref={videoRef} autoPlay muted playsInline className="max-h-[60vh] w-full rounded-xl bg-black object-contain"/>}
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {captured ? <><button type="button" className="btn-primary justify-center" onClick={useCaptured}><CameraIcon size={17}/>Use this photo</button><button type="button" className="rounded-xl border px-4 py-3" onClick={() => void openCamera(facingMode)}><RefreshCw className="mr-1 inline" size={17}/>Retake</button></> : <><button type="button" className="rounded-xl border px-4 py-3" disabled={cameraStarting || !!cameraError} onClick={() => void openCamera(facingMode === 'environment' ? 'user' : 'environment')}><SwitchCamera className="mr-1 inline" size={17}/>Switch camera</button><button type="button" className="btn-primary justify-center" disabled={cameraStarting || !!cameraError || !stream} onClick={capture}><CameraIcon size={17}/>Capture photo</button></>}
        {cameraError && <button type="button" className="rounded-xl border px-4 py-3 sm:col-span-2" onClick={() => void openCamera(facingMode)}>Try camera again</button>}
      </div>
    </section></div>}
  </div>;
}
