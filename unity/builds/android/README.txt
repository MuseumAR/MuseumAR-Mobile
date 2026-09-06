Export the Unity 3dAR project HERE as Unity-as-a-Library for Android.

Unity Editor steps:
1. Open C:\Users\ADMIN\Downloads\SEP\UnityAr\2d\3dAR
2. File → Build Profiles / Build Settings → Android
3. Switch Platform → Android
4. DELETE old files in this folder first (keep README.txt), then Export Project
   (NOT Build And Run) into:
   MuseumAR-Mobile\unity\builds\android
5. After export, edit:
   unity/builds/android/unityLibrary/src/main/AndroidManifest.xml
   Remove any <intent-filter> with MAIN/LAUNCHER so only the library remains.
6. In MuseumAR-Mobile run:
   npx expo prebuild --clean
   npx expo run:android

Required scene object: ArExhibitLoader (ReceiveArPayload) — see Assets/Scripts/AR_HOOKUP.md

Mobile payload (3D only):
  {"exhibitId":42,"assetType":"Model3D","modelUrl":"https://.../model.glb"}
