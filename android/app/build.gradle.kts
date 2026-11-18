plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "ma.samed.blotline"
    compileSdk = 36

    defaultConfig {
        applicationId = "ma.samed.blotline"
        minSdk = 29
        targetSdk = 36
        versionCode = (System.getenv("BLOTLINE_VERSION_CODE") ?: "1").toInt()
        versionName = "1.0.0"
    }

    signingConfigs {
        create("release") {
            val path = System.getenv("BLOTLINE_KEYSTORE")
            if (path != null) {
                storeFile = file(path)
                storeType = "PKCS12"
                storePassword = System.getenv("BLOTLINE_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("BLOTLINE_KEY_ALIAS")
                keyPassword = System.getenv("BLOTLINE_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            signingConfig = signingConfigs.getByName("release")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}

dependencies {
    implementation("androidx.core:core-ktx:1.17.0")
    implementation("androidx.activity:activity-ktx:1.11.0")
    implementation("androidx.webkit:webkit:1.14.0")
}
