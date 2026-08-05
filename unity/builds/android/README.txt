Export the Unity 2d_Ar project HERE as Unity-as-a-Library for Android.

Unity Editor steps:
1. Open C:\Users\ADMIN\Downloads\SEP\UnityAr\2d\2d_Ar
2. File → Build Profiles / Build Settings → Android
3. Switch Platform → Android
4. Export Project (NOT Build And Run) into THIS folder:
   MuseumAR-Mobile\unity\builds\android
5. After export, edit:
   unity/builds/android/unityLibrary/src/main/AndroidManifest.xml
   Remove any <intent-filter> with MAIN/LAUNCHER so only the library remains.
6. In MuseumAR-Mobile run:
   npx expo prebuild --clean
   npx expo run:android

Required scene object: ArExhibitLoader (ReceiveArPayload).
