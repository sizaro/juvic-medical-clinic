import { api } from './api';

export type UploadedAsset={url:string;publicId:string;mimeType:string;originalName:string;size:number;resourceType:string};

async function compressImage(file:File):Promise<File>{
  if(!file.type.startsWith('image/'))return file;
  const bitmap=await createImageBitmap(file);const max=1600;const scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
  const context=canvas.getContext('2d');if(!context)throw new Error('This browser cannot prepare the image.');
  context.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(x=>x?resolve(x):reject(new Error('Image compression failed.')),'image/jpeg',0.78));
  return new File([blob],file.name.replace(/\.[^.]+$/,'.jpg'),{type:'image/jpeg',lastModified:Date.now()});
}

export const uploadService={
  upload:async(file:File,folder:string)=>{const prepared=await compressImage(file);const body=new FormData();body.append('file',prepared);body.append('folder',folder);return (await api.post<UploadedAsset>('/uploads',body,{headers:{'Content-Type':'multipart/form-data'},timeout:60_000})).data;}
};
