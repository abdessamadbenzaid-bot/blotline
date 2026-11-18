-keepattributes RuntimeVisibleAnnotations
-keep class ma.samed.blotline.MainActivity$Bridge { *; }
-keepclassmembers class ma.samed.blotline.MainActivity$Bridge {
    @android.webkit.JavascriptInterface <methods>;
}
