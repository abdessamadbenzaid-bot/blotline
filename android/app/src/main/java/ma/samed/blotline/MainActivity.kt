package ma.samed.blotline

import android.annotation.SuppressLint
import android.content.ContentValues
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.provider.MediaStore
import android.util.Base64
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.OnBackPressedCallback
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.webkit.WebViewAssetLoader
import java.io.OutputStream

class MainActivity : ComponentActivity() {

    private lateinit var web: WebView
    private var fileCallback: ValueCallback<Array<Uri>>? = null

    // System photo picker: the app never needs READ_MEDIA_VIDEO.
    private val picker = registerForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
        fileCallback?.onReceiveValue(uri?.let { arrayOf(it) })
        fileCallback = null
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)

        val assets = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()

        web = WebView(this).apply {
            setBackgroundColor(Color.parseColor("#0D0D0B"))
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.mediaPlaybackRequiresUserGesture = false
            settings.allowFileAccess = false
            webViewClient = object : WebViewClient() {
                override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? =
                    assets.shouldInterceptRequest(request.url)

                // The app is one local page: every navigation elsewhere is refused.
                override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest) = true
            }
            webChromeClient = object : WebChromeClient() {
                override fun onShowFileChooser(
                    view: WebView,
                    callback: ValueCallback<Array<Uri>>,
                    params: FileChooserParams
                ): Boolean {
                    fileCallback?.onReceiveValue(null)
                    fileCallback = callback
                    picker.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.VideoOnly))
                    return true
                }
            }
            addJavascriptInterface(Bridge(), "BlotlineNative")
        }

        ViewCompat.setOnApplyWindowInsetsListener(web) { view, insets ->
            val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout())
            view.setPadding(bars.left, bars.top, bars.right, bars.bottom)
            WindowInsetsCompat.CONSUMED
        }
        setContentView(web)

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                web.evaluateJavascript("window.blotlineBack&&window.blotlineBack()") { handled ->
                    if (handled != "true") finish()
                }
            }
        })

        web.loadUrl("https://appassets.androidplatform.net/assets/index.html")
    }

    override fun onDestroy() {
        web.destroy()
        super.onDestroy()
    }

    /** Called only by the bundled page. Saves the finished video to Movies/Blotline. */
    inner class Bridge {
        private var stream: OutputStream? = null
        private var pending: Uri? = null
        private var lastSaved: Uri? = null

        @JavascriptInterface
        fun begin(name: String, mime: String): Boolean = try {
            val values = ContentValues().apply {
                put(MediaStore.Video.Media.DISPLAY_NAME, name.substringAfterLast('/'))
                put(MediaStore.Video.Media.MIME_TYPE, mime)
                put(MediaStore.Video.Media.RELATIVE_PATH, "Movies/Blotline")
                put(MediaStore.Video.Media.IS_PENDING, 1)
            }
            val collection = MediaStore.Video.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
            pending = contentResolver.insert(collection, values)
            stream = pending?.let { contentResolver.openOutputStream(it) }
            stream != null
        } catch (e: Exception) {
            false
        }

        @JavascriptInterface
        fun write(base64: String) {
            stream?.write(Base64.decode(base64, Base64.DEFAULT))
        }

        @JavascriptInterface
        fun end(): String {
            stream?.close()
            stream = null
            val uri = pending ?: return ""
            contentResolver.update(uri, ContentValues().apply { put(MediaStore.Video.Media.IS_PENDING, 0) }, null, null)
            lastSaved = uri
            pending = null
            return uri.toString()
        }

        @JavascriptInterface
        fun shareLast() {
            val uri = lastSaved ?: return
            val send = Intent(Intent.ACTION_SEND).apply {
                type = "video/mp4"
                putExtra(Intent.EXTRA_STREAM, uri)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            runOnUiThread { startActivity(Intent.createChooser(send, null)) }
        }

        @JavascriptInterface
        fun keepAwake(on: Boolean) {
            runOnUiThread {
                if (on) window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
                else window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            }
        }
    }
}
