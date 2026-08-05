Export UnityFramework for iOS HERE (after building UnityFramework in Xcode).

See @azesmway/react-native-unity README:
- Copy NativeCallProxy into the Unity project (already done under Assets/Plugins/iOS)
- Build UnityFramework and place UnityFramework.framework (or .xcframework) in this folder
- Then: npx expo prebuild && npx expo run:ios
