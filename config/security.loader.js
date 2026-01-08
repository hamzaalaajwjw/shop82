import { firebaseConfig } from './firebase.public.js';
export function loadFirebase(app){
  if(!app) throw new Error("Unauthorized init");
  return firebaseConfig;
}