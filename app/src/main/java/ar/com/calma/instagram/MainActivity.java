package ar.com.calma.instagram;

import android.annotation.SuppressLint;
import android.webkit.JavascriptInterface;
import android.media.AudioManager;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceError;
import android.webkit.PermissionRequest;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import org.json.JSONObject;
import org.json.JSONTokener;

/**
 * Calma: cliente web intencional para Instagram.
 *
 * No recolecta contraseñas, mensajes, contactos ni cookies; sólo usa la WebView local.
 * Acceso limitado a instagram.com y dominios de autenticación de Facebook.
 * Rutas de consumo compulsivo bloqueadas además del filtro visual inyectado.
 *
 * AVISO: Instagram es un sitio ajeno; puede cambiar sus HTML o restringir WebView.
 */
public final class MainActivity extends Activity {
    private static final int PICK_FILE = 812;
    private static final String SEARCH = "https://www.instagram.com/explore/search/";
    private static final String INBOX = "https://www.instagram.com/direct/inbox/";
    // UA de escritorio: sólo se activa al publicar, y se restaura al salir.
    // No simulamos una aplicación oficial ni utilizamos APIs privadas de Instagram.
    private static final String DESKTOP_UA_PREFIX =
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) ";
    private static final String CONTEXT_JS = "(function(){try{return window.__calmaContext " +
            "? window.__calmaContext() : JSON.stringify({path:location.pathname,profile:'',author:''});" +
            "}catch(e){return '{}';}})();";
    private static final String OPEN_CREATE_JS = "(function(){try{return !!(window.__calmaOpenComposer " +
            "&& window.__calmaOpenComposer());}catch(e){return false;}})();";
    private static final int BG = Color.rgb(17, 19, 24);
    private static final int SURFACE = Color.rgb(29, 32, 38);
    private static final int ACCENT = Color.rgb(136, 215, 183);
    private static final int TEXT = Color.rgb(244, 245, 247);
    private static final int MUTED = Color.rgb(167, 176, 182);

    private FrameLayout contentFrame;
    private View cover;
    private WebView webView;
    private TextView currentSection;
    private TextView subtitle;
    private TextView publishButton;
    private String selectedUsername = "";
    private String currentPageKind = "";
    private String standardUserAgent;
    private String desktopUserAgent;
    private boolean publishingMode = false;
    private boolean createPending = false;
    private int createAttempts = 0;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable pollContext = new Runnable() {
        @Override public void run() {
            refreshContext();
            handler.postDelayed(this, 1100);
        }
    };
    private String filterScript;
    private String clipScript;
    private String profileStoriesScript;
    private volatile String allowedProfileStoryPath = "";
    private volatile String returnProfileUrl = "";
    private volatile long profileStoryExpiry = 0;
    private volatile String mainPageUrl = INBOX;
    private volatile String lastChatUrl = INBOX;
    private volatile String allowedClipPath = "";
    private volatile long clipArmExpiry = 0;
    private volatile boolean allowNextSharedClip = false;
    private volatile boolean clipActive = false;
    private android.webkit.ValueCallback<Uri[]> fileCallback;
    private long lastBlockedNoticeAt = 0;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(BG);
        getWindow().setNavigationBarColor(BG);
        getWindow().getDecorView().setSystemUiVisibility(0);
        filterScript = readAsset("filter.js");
        clipScript = readAsset("clip.js");
        profileStoriesScript = readAsset("profile-stories.js");
        setVolumeControlStream(AudioManager.STREAM_MUSIC);
        buildInterface();
        createWebView();
        webView.loadUrl(INBOX);
    }

    private String readAsset(String name) {
        try (InputStream stream = getAssets().open(name);
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[4096];
            int size;
            while ((size = stream.read(buffer)) != -1) out.write(buffer, 0, size);
            return new String(out.toByteArray(), StandardCharsets.UTF_8);
        } catch (Exception ex) {
            return "";
        }
    }

    private int dp(float v) { return (int) (getResources().getDisplayMetrics().density * v + 0.5f); }

    private GradientDrawable shape(int background, float radiusDp, int stroke) {
        GradientDrawable d = new GradientDrawable();
        d.setColor(background);
        d.setCornerRadius(dp(radiusDp));
        if (stroke != Color.TRANSPARENT) d.setStroke(dp(1), stroke);
        return d;
    }

    private LinearLayout column() {
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        return layout;
    }
    private TextView text(String value, float size, int color, boolean bold) {
        TextView tv = new TextView(this);
        tv.setText(value);
        tv.setTextSize(size);
        tv.setTextColor(color);
        tv.setGravity(Gravity.CENTER_VERTICAL);
        if (bold) tv.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        return tv;
    }

    private void buildInterface() {
        LinearLayout root = column();
        root.setBackgroundColor(BG);
        root.setFitsSystemWindows(false);
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            int top;
            int bottom;
            if (Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets safe = insets.getInsets(WindowInsets.Type.systemBars());
                top = safe.top; bottom = safe.bottom;
            } else {
                top = insets.getSystemWindowInsetTop();
                bottom = insets.getSystemWindowInsetBottom();
            }
            root.setPadding(0, top, 0, bottom);
            return insets;
        });

        LinearLayout header = column();
        header.setPadding(dp(19), dp(12), dp(19), dp(12));
        TextView brand = text("calma.", 27, TEXT, true);
        header.addView(brand, new LinearLayout.LayoutParams(-1, dp(36)));
        LinearLayout contextRow = new LinearLayout(this);
        contextRow.setGravity(Gravity.CENTER_VERTICAL);
        subtitle = text("Instagram, sin el ruido", 12, MUTED, false);
        subtitle.setSingleLine(true);
        subtitle.setEllipsize(android.text.TextUtils.TruncateAt.END);
        contextRow.addView(subtitle, new LinearLayout.LayoutParams(0, dp(24), 1));
        TextView mode = text("MODO ESENCIAL", 9, ACCENT, true);
        mode.setGravity(Gravity.CENTER);
        mode.setPadding(dp(10), dp(6), dp(10), dp(6));
        mode.setBackground(shape(SURFACE, 18, Color.rgb(60, 91, 77)));
        contextRow.addView(mode);
        header.addView(contextRow);
        root.addView(header);

        contentFrame = new FrameLayout(this);
        contentFrame.setBackgroundColor(Color.WHITE);
        root.addView(contentFrame, new LinearLayout.LayoutParams(-1, 0, 1));

        LinearLayout bottom = column();
        bottom.setBackgroundColor(BG);
        bottom.setPadding(dp(12), dp(9), dp(12), dp(10));
        currentSection = text("  Solo se muestran las secciones que elegís abrir.", 11, MUTED, false);
        currentSection.setSingleLine(true);
        currentSection.setEllipsize(android.text.TextUtils.TruncateAt.END);
        currentSection.setContentDescription("Usuario mostrado. Tocá para abrir su perfil si está disponible");
        currentSection.setOnClickListener(v -> openSelectedProfile());
        bottom.addView(currentSection, new LinearLayout.LayoutParams(-1, dp(21)));

        LinearLayout toolbar = new LinearLayout(this);
        toolbar.setGravity(Gravity.CENTER);
        toolbar.addView(makeButton("✉ Chats", () -> {
                if (publishingMode) confirmLeavePublishing(INBOX); else go(INBOX);
            }), new LinearLayout.LayoutParams(0, dp(49), 1.0f));
        toolbar.addView(makeButton("⌕ Buscar", this::openInstagramSearch),
                new LinearLayout.LayoutParams(0, dp(49), .9f));
        TextView updatesButton = makeButton("♡", () -> {
            String activity = "https://www.instagram.com/accounts/activity/";
            if (publishingMode) confirmLeavePublishing(activity); else go(activity);
        });
        updatesButton.setContentDescription("Actualizaciones de Instagram");
        toolbar.addView(updatesButton, new LinearLayout.LayoutParams(0, dp(49), .5f));
        publishButton = makeButton("＋ Publicar", this::onPublishButton);
        publishButton.setTextColor(ACCENT);
        toolbar.addView(publishButton, new LinearLayout.LayoutParams(0, dp(49), 1.1f));
        toolbar.addView(makeButton("↻", () -> webView.reload()),
                new LinearLayout.LayoutParams(0, dp(49), .42f));
        toolbar.addView(makeButton("⋯", this::showOptions),
                new LinearLayout.LayoutParams(0, dp(49), .42f));
        bottom.addView(toolbar);
        root.addView(bottom);
        setContentView(root);
    }

    private TextView makeButton(String label, Runnable action) {
        TextView btn = text(label, 14, TEXT, true);
        btn.setGravity(Gravity.CENTER);
        btn.setBackground(shape(SURFACE, 12, BG));
        btn.setOnClickListener(view -> action.run());
        btn.setContentDescription(label);
        LinearLayout.LayoutParams p = new LinearLayout.LayoutParams(-1, -1);
        p.setMargins(dp(2), 0, dp(2), 0);
        btn.setPadding(dp(2), dp(4), dp(2), dp(4));
        return btn;
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void createWebView() {
        webView = new WebView(this);
        webView.setBackgroundColor(Color.WHITE);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true); // Instagram requiere JavaScript.
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        // Requerir un gesto hasta que se abra un clip compartido desde Direct.
        // Los controles del visor permiten activar audio explícitamente.
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true); // Android Photo Picker/archivos para adjuntos.
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setSafeBrowsingEnabled(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);

        // Evita que un UA de WebView fuerce banners exclusivos para navegadores embebidos.
        // Puede dejar de funcionar ante cambios del sitio; no elude autenticación.
        String ua = settings.getUserAgentString();
        if (ua != null) {
            settings.setUserAgentString(ua.replace("; wv", "").replace("Version/4.0 ", ""));
        }
        standardUserAgent = settings.getUserAgentString();
        // Mantener la versión real de Chrome/WebView evita declararse como un
        // navegador antiguo o inventar una versión en el modo escritorio.
        java.util.regex.Matcher chrome = java.util.regex.Pattern
            .compile("Chrome/[0-9.]+", java.util.regex.Pattern.CASE_INSENSITIVE)
            .matcher(standardUserAgent == null ? "" : standardUserAgent);
        desktopUserAgent = DESKTOP_UA_PREFIX +
            (chrome.find() ? chrome.group() : "Chrome/131.0.0.0") + " Safari/537.36";
        // Puente sin lectura de cookies/DOM/archivos: únicamente permite
        // un clip a partir de un toque desde Direct y actualiza el estado.
        webView.addJavascriptInterface(new ClipBridge(), "CalmaBridge");
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, false);

        webView.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view,
                  android.webkit.ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                try {
                    Intent select = params.createIntent();
                    select.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    startActivityForResult(select, PICK_FILE);
                    return true;
                } catch (ActivityNotFoundException ex) {
                    fileCallback = null;
                    Toast.makeText(MainActivity.this, "No hay selector de archivos", Toast.LENGTH_LONG).show();
                    return false;
                }
            }
            @Override public void onPermissionRequest(PermissionRequest request) {
                // No concedemos cámara/micrófono automáticamente a contenido web.
                runOnUiThread(request::deny);
            }
        });
        webView.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (!request.isForMainFrame()) return false;
                return intercept(request.getUrl());
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return intercept(Uri.parse(url));
            }
            @Override public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                mainPageUrl = url;
                if (isInbox(url)) lastChatUrl = url;
                showCover();
                updateCurrentLabel(url);
            }
            @Override public void doUpdateVisitedHistory(WebView view, String url, boolean reload) {
                mainPageUrl = url; // Incluye navegación SPA de Instagram.
            }
            @Override public void onPageCommitVisible(WebView view, String url) { injectFilter(false); }
            @Override public void onPageFinished(WebView view, String url) {
                mainPageUrl = url;
                if (isInbox(url)) lastChatUrl = url;
                injectFilter(true);
                refreshContext();
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request,
                                                  WebResourceError error) {
                if (request.isForMainFrame()) hideCover();
            }
        });
        contentFrame.addView(webView, new FrameLayout.LayoutParams(-1, -1));
        showCover();
    }

    private boolean intercept(Uri uri) {
        String scheme = uri.getScheme();
        if (scheme == null) return true;
        scheme = scheme.toLowerCase(Locale.ROOT);
        // Bloquea explícitamente deep-links, Play Store y descargas de la app.
        if (!scheme.equals("https") && !scheme.equals("http")) {
            blockedNotice(); return true;
        }
        if (!scheme.equals("https")) return true;
        String host = uri.getHost();
        if (host == null) return true;
        host = host.toLowerCase(Locale.ROOT);
        if (host.equals("instagram.com") || host.endsWith(".instagram.com")) {
            String path = uri.getPath();
            if (blockedRoute(path) && !mayOpenSharedClip(path) && !mayOpenProfileStory(path)) {
                blockedNotice();
                return true;
            }
            return false;
        }
        // Permitir login con Facebook si Instagram envía allí para autenticar.
        if (host.equals("facebook.com") || host.endsWith(".facebook.com")) return false;
        // Nunca lanzar automáticamente market://, intent:// ni tiendas de aplicaciones.
        blockedNotice();
        return true;
    }

    /** La navegación a un solo clip dura lo suficiente para abrir la tarjeta
     * compartida y no permite visitar el catálogo /reels/ ni otro video. */
    private boolean singleClipPath(String path) {
        return path != null && (path.matches("(?i)^/reel/[a-z0-9_-]+/?$") ||
            path.matches("(?i)^/stories/[a-z0-9._]+/[0-9]+/?$"));
    }

    private boolean mayOpenSharedClip(String path) {
        if (!singleClipPath(path)) return false;
        long now = android.os.SystemClock.elapsedRealtime();
        String normalized = path.replaceAll("/$", "");
        if (normalized.equals(allowedClipPath) &&
            (clipActive || now <= clipArmExpiry)) return true;
        if (now <= clipArmExpiry && (allowNextSharedClip || normalized.equals(allowedClipPath))) {
            allowedClipPath = normalized;
            allowNextSharedClip = false;
            return true;
        }
        return false;
    }

    private boolean mayOpenProfileStory(String path) {
        if (path == null || allowedProfileStoryPath.isEmpty() ||
            android.os.SystemClock.elapsedRealtime() > profileStoryExpiry) return false;
        String normalized = path.replaceAll("/$", "");
        if (normalized.equals(allowedProfileStoryPath)) return true;
        // A profile avatar may omit the first item ID. Pin that first item,
        // then reject all following items, including another user's stories.
        if ((allowedProfileStoryPath.matches("(?i)^/stories/[a-z0-9._]+$") ||
             allowedProfileStoryPath.matches("(?i)^/stories/highlights/[0-9]+$")) &&
            normalized.matches(java.util.regex.Pattern.quote(allowedProfileStoryPath) + "/[0-9]+")) {
            allowedProfileStoryPath = normalized;
            return true;
        }
        return false;
    }

    private void clearSharedClip() {
        clipActive = false;
        allowNextSharedClip = false;
        clipArmExpiry = 0;
        allowedClipPath = "";
        if (webView != null) webView.getSettings().setMediaPlaybackRequiresUserGesture(true);
    }

    /** JavaScript interfaces are visible to iframes: do not provide privileged
     * reads, arbitrary navigation, permissions or access to account data. */
    private final class ClipBridge {
        @JavascriptInterface public void armProfileStory(String rawUrl, String profileUrl) {
            if (rawUrl == null || profileUrl == null || rawUrl.length() > 300 || profileUrl.length() > 200) return;
            Uri source = Uri.parse(profileUrl);
            Uri target = Uri.parse(rawUrl);
            String user = usernameFromPath(source.getPath());
            if (user.isEmpty() || !"https".equals(source.getScheme()) ||
                !"www.instagram.com".equalsIgnoreCase(source.getHost()) ||
                !"https".equals(target.getScheme()) ||
                !("www.instagram.com".equalsIgnoreCase(target.getHost()) ||
                  "instagram.com".equalsIgnoreCase(target.getHost()))) return;
            Uri current = Uri.parse(mainPageUrl == null ? "" : mainPageUrl);
            if (!user.equalsIgnoreCase(usernameFromPath(current.getPath()))) return;
            String path = target.getPath();
            if (path == null || !(path.matches("(?i)^/stories/" + java.util.regex.Pattern.quote(user) + "(/[0-9]+)?/?$") ||
                path.matches("(?i)^/stories/highlights/[0-9]+/?$"))) return;
            allowedProfileStoryPath = path.replaceAll("/$", "");
            returnProfileUrl = "https://www.instagram.com/" + user + "/";
            profileStoryExpiry = android.os.SystemClock.elapsedRealtime() + 120000;
        }
        @JavascriptInterface public void armClip(String rawUrl) {
            if (rawUrl == null || rawUrl.length() > 300) return;
            // The source must be a Direct chat; no background reels activation.
            if (mainPageUrl == null || !mainPageUrl.contains("instagram.com/direct/")) return;
            String approved = "";
            if (!rawUrl.isEmpty()) {
                Uri uri = Uri.parse(rawUrl);
                String host = uri.getHost();
                if (!"https".equalsIgnoreCase(uri.getScheme()) || host == null ||
                    !(host.equalsIgnoreCase("instagram.com") ||
                      host.equalsIgnoreCase("www.instagram.com"))) return;
                String path = uri.getPath();
                if (path == null || !(singleClipPath(path) || path.matches("(?i)^/p/[a-z0-9_-]+/?$"))) return;
                approved = path.replaceAll("/$", "");
            }
            allowedClipPath = approved;
            clipArmExpiry = android.os.SystemClock.elapsedRealtime() + 12000;
            allowNextSharedClip = rawUrl.isEmpty();
            runOnUiThread(() -> {
                if (webView != null) webView.getSettings().setMediaPlaybackRequiresUserGesture(false);
            });
        }
        @JavascriptInterface public void setClipActive(boolean showing) {
            clipActive = showing;
            if (!showing) runOnUiThread(() -> clearSharedClip());
        }
    }

    private boolean isInbox(String url) {
        return url != null && url.startsWith("https://www.instagram.com/direct/");
    }
    private boolean blockedRoute(String path) {
        if (path == null) return false;
        if (path.equals("/")) return true;
        String p = path.toLowerCase(Locale.ROOT);
        if (p.equals("/explore/search") || p.equals("/explore/search/")) return false;
        return p.matches("^/(reels?|explore|stories|tv|clips)(/.*)?$");
    }
    private void blockedNotice() {
        long now = android.os.SystemClock.elapsedRealtime();
        if (now - lastBlockedNoticeAt < 1200) return;
        lastBlockedNoticeAt = now;
        Toast.makeText(this, "Sección bloqueada en Calma", Toast.LENGTH_SHORT).show();
    }
    private void injectFilter(boolean clearCover) {
        if (webView == null) return;
        if (filterScript.length() == 0) {
            if (clearCover) hideCover();
            return;
        }
        Uri page = Uri.parse(webView.getUrl() == null ? "" : webView.getUrl());
        String host = page.getHost();
        if (host == null || !(host.equals("instagram.com") || host.endsWith(".instagram.com"))) {
            if (clearCover) hideCover();
            return;
        }
        String current = page.getPath();
        String allowed = (current != null && current.replaceAll("/$", "").equals(allowedClipPath) &&
            android.os.SystemClock.elapsedRealtime() <= clipArmExpiry + 120000)
            ? allowedClipPath : "";
        String story = mayOpenProfileStory(current) ? allowedProfileStoryPath : "";
        String allScripts = "window.__calmaApprovedProfileStoryPath=" + JSONObject.quote(story) +
            ";\nwindow.__calmaReturnProfileUrl=" + JSONObject.quote(returnProfileUrl) + ";\n" +
            profileStoriesScript + "\nwindow.__calmaApprovedSingleClipPath=" +
            JSONObject.quote(allowed) + ";\nwindow.__calmaReturnChatUrl=" +
            JSONObject.quote(lastChatUrl) + ";\n" + filterScript + "\n" + clipScript;
        webView.evaluateJavascript(allScripts, result -> {
            if (clearCover) hideCover();
            if (publishingMode && createPending) attemptOpenComposer();
            refreshContext();
        });
    }
    private void showCover() {
        if (cover != null) contentFrame.removeView(cover);
        LinearLayout loading = column();
        loading.setGravity(Gravity.CENTER);
        loading.setBackgroundColor(BG);
        TextView logo = text("calma.", 36, ACCENT, true);
        logo.setGravity(Gravity.CENTER);
        loading.addView(logo, new LinearLayout.LayoutParams(-1, dp(60)));
        TextView desc = text("Cargando lo esencial…", 13, MUTED, false);
        desc.setGravity(Gravity.CENTER);
        loading.addView(desc);
        contentFrame.addView(loading, new FrameLayout.LayoutParams(-1, -1));
        cover = loading;
    }
    private void hideCover() {
        if (cover != null) {
            contentFrame.removeView(cover);
            cover = null;
        }
    }
    private void go(String url) {
        if (webView == null) return;
        if (clipActive || !allowedClipPath.isEmpty()) {
            webView.evaluateJavascript("window.__calmaClipDismiss?.();", null);
            clearSharedClip();
        }
        // Salir del modo escritorio evita dejar sesiones de publicación a medias
        // al saltar de un perfil a otro. No se envía ninguna publicación sin permiso.
        if (publishingMode) { exitPublishingMode(url); return; }
        if (url.equals(INBOX) || (Uri.parse(url).getHost() != null &&
            Uri.parse(url).getHost().equals("www.instagram.com") &&
            !blockedRoute(Uri.parse(url).getPath()))) {
            webView.loadUrl(url);
        }
    }

    private void onPublishButton() {
        if (publishingMode) {
            // El botón es explícito: permite recuperar la vista normal tras publicar.
            confirmLeavePublishing(INBOX);
            return;
        }
        if (clipActive || !allowedClipPath.isEmpty()) {
            webView.evaluateJavascript("window.__calmaClipDismiss?.();", null);
            clearSharedClip();
        }
        publishingMode = true;
        createPending = true;
        createAttempts = 0;
        selectedUsername = "";
        currentPageKind = "publish";
        publishButton.setText("✓ Salir");
        publishButton.setContentDescription("Salir del modo de publicación");
        subtitle.setText("Modo publicación · Instagram web");
        currentSection.setText("  Tocá Crear (+) si no se abre el editor automáticamente");
        // La interfaz móvil no siempre ofrece 'Crear'. Utilizamos el editor
        // original de Instagram con su versión web de escritorio, no una API.
        webView.getSettings().setUserAgentString(desktopUserAgent);
        webView.getSettings().setLoadWithOverviewMode(true);
        webView.getSettings().setUseWideViewPort(true);
        // Abrir un área sin feed; el menú de escritorio contiene 'Crear'.
        webView.loadUrl(INBOX);
    }

    private void attemptOpenComposer() {
        if (!publishingMode || !createPending || webView == null) return;
        String url = webView.getUrl();
        if (url == null || !url.startsWith("https://www.instagram.com/") ||
            url.contains("/accounts/login") || url.contains("/challenge/")) return;
        if (++createAttempts > 14) {
            createPending = false;
            currentSection.setText("  Publicar: tocá Crear (+) en la web de Instagram");
            return;
        }
        webView.evaluateJavascript(OPEN_CREATE_JS, result -> {
            if (!publishingMode) return;
            if ("true".equals(result)) {
                createPending = false;
                currentSection.setText("  Elegí fotos o videos y completá la publicación");
            }
        });
    }

    private void confirmLeavePublishing(String destination) {
        new AlertDialog.Builder(this).setTitle("Salir del editor")
            .setMessage("Si todavía estás editando una publicación, Instagram podría " +
                        "descartar el borrador. ¿Querés salir?")
            .setNegativeButton("Seguir editando", null)
            .setPositiveButton("Salir del editor", (dialog, which) -> exitPublishingMode(destination))
            .show();
    }

    private void exitPublishingMode(String destination) {
        if (!publishingMode) { go(destination); return; }
        publishingMode = false;
        createPending = false;
        createAttempts = 0;
        selectedUsername = "";
        currentPageKind = "";
        publishButton.setText("＋ Publicar");
        publishButton.setContentDescription("Crear publicación de Instagram");
        subtitle.setText("Instagram, sin el ruido");
        webView.getSettings().setUserAgentString(standardUserAgent);
        webView.getSettings().setLoadWithOverviewMode(true);
        if (destination == null || blockedRoute(Uri.parse(destination).getPath())) destination = INBOX;
        webView.loadUrl(destination);
    }

    private void updateCurrentLabel(String url) {
        if (publishingMode) {
            subtitle.setText("Modo publicación · Instagram web");
            if (createPending) currentSection.setText("  Publicar: tocá Crear (+) si no aparece solo");
            return;
        }
        Uri uri;
        try { uri = Uri.parse(url == null ? "" : url); }
        catch (Exception e) { return; }
        String path = uri.getPath();
        if (path == null) path = "";
        String user = usernameFromPath(path);
        selectedUsername = user;
        if (!user.isEmpty()) {
            currentPageKind = "profile";
            subtitle.setText("Viendo @" + user);
            currentSection.setText("  Perfil: @" + user + " · tocá para abrir");
        } else if (path.equals("/explore/search") || path.equals("/explore/search/")) {
            currentPageKind = "search";
            subtitle.setText("Buscar en Instagram");
            currentSection.setText("  Buscá por nombre o parte del usuario");
        } else if (path.startsWith("/direct/")) {
            currentPageKind = "messages";
            subtitle.setText("Mensajes, sin distracciones");
            currentSection.setText("  Mensajes privados · sin feed");
        } else if (path.startsWith("/accounts/activity")) {
            currentPageKind = "activity";
            subtitle.setText("Actividad de tu cuenta");
            currentSection.setText("  Actualizaciones · sin feed");
        } else if (path.startsWith("/stories/") && mayOpenProfileStory(path)) {
            currentPageKind = "story";
            subtitle.setText("Historia elegida · una sola");
            currentSection.setText("  Volvé al perfil para elegir otra");
        } else if (path.startsWith("/reel/") || path.startsWith("/stories/")) {
            currentPageKind = "post";
            subtitle.setText("Video compartido · uno solo");
            currentSection.setText("  Sin swipe · sonido dentro del visor");
        } else if (path.startsWith("/p/")) {
            currentPageKind = "post";
            subtitle.setText("Publicación · sin recomendaciones");
            currentSection.setText("  Publicación · buscando el perfil de quien publicó");
        } else if (path.startsWith("/accounts/login")) {
            currentPageKind = "login";
            subtitle.setText("Iniciá sesión en Instagram");
            currentSection.setText("  Acceso directo a Instagram");
        } else {
            currentPageKind = "other";
            subtitle.setText("Instagram, sin el ruido");
            currentSection.setText("  Navegación intencional · sin Reels");
        }
    }

    // Sólo una ruta con un segmento que tenga formato de usuario es un perfil.
    // Evita confundir /p/, /direct/, /create/, /accounts/, etc. con personas.
    private String usernameFromPath(String path) {
        if (path == null) return "";
        java.util.regex.Matcher matcher = java.util.regex.Pattern
                .compile("^/([A-Za-z0-9._]{1,30})/?$").matcher(path);
        if (!matcher.matches()) return "";
        String user = matcher.group(1);
        String lower = user.toLowerCase(Locale.ROOT);
        if (java.util.Arrays.asList("p", "reel", "reels", "direct", "create", "explore",
            "accounts", "stories", "tv", "clips", "about", "developer", "legal", "api",
            "web", "privacy", "terms", "challenge", "graphql").contains(lower)) return "";
        return user;
    }

    private void refreshContext() {
        if (webView == null) return;
        final String url = webView.getUrl();
        if (url == null || !url.startsWith("https://www.instagram.com/")) return;
        if (isInbox(url)) lastChatUrl = url; // También cambios SPA entre chats.
        if (publishingMode) {
            if (createPending) attemptOpenComposer();
            return;
        }
        // Se revisa el DOM únicamente dentro de Instagram para reconocer
        // navegación SPA y autor de una publicación abierta en modal.
        webView.evaluateJavascript(CONTEXT_JS, result -> {
            if (webView == null || publishingMode || result == null) return;
            try {
                Object decoded = new JSONTokener(result).nextValue();
                if (!(decoded instanceof String)) return;
                JSONObject context = new JSONObject((String) decoded);
                String path = context.optString("path", "");
                String actual = Uri.parse(webView.getUrl() == null ? "" : webView.getUrl()).getPath();
                if (actual == null || !actual.equals(path)) return; // Respuesta vieja por SPA.
                String type = context.optString("type", "");
                String profile = context.optString("profile", "");
                String author = context.optString("author", "");
                String user = "profile".equals(type) ? profile :
                              ("post".equals(type) ? author : "");
                if (!user.isEmpty() && !user.matches("[A-Za-z0-9._]{1,30}")) user = "";
                if ("profile".equals(type) || "post".equals(type)) {
                    // Si no se detectó el autor, no reusar el usuario anterior.
                    selectedUsername = user;
                    currentPageKind = type;
                    if ("profile".equals(type) && !user.isEmpty()) {
                        subtitle.setText("Viendo @" + user);
                        currentSection.setText("  Perfil: @" + user + " · tocá para abrir");
                    } else if ("profile".equals(type)) {
                        updateCurrentLabel(webView.getUrl());
                    } else if (!user.isEmpty()) {
                        subtitle.setText("Publicación de @" + user);
                        currentSection.setText("  Autor: @" + user + " · tocá para ver su perfil");
                    } else {
                        subtitle.setText("Publicación · sin recomendaciones");
                        currentSection.setText("  Tocá el nombre del autor en Instagram para ver su perfil");
                    }
                } else if (!type.equals(currentPageKind)) {
                    updateCurrentLabel(webView.getUrl());
                }
            } catch (Exception ignored) { /* Contenido no compatible: mostrar URL. */ }
        });
    }

    private void openSelectedProfile() {
        if (publishingMode) {
            Toast.makeText(this, "Terminá la publicación antes de cambiar de perfil", Toast.LENGTH_SHORT).show();
            return;
        }
        if (selectedUsername == null || selectedUsername.isEmpty()) {
            Toast.makeText(this, "Abrí un perfil o una publicación para identificar su autor", Toast.LENGTH_LONG).show();
            return;
        }
        go("https://www.instagram.com/" + selectedUsername + "/");
    }

    private void openInstagramSearch() {
        if (publishingMode) {
            confirmLeavePublishing(SEARCH);
            return;
        }
        if (webView == null) return;
        if (clipActive || !allowedClipPath.isEmpty()) {
            go(SEARCH);
            return;
        }
        // Usar el panel de búsqueda oficial si está disponible en la página.
        // En otros diseños, abrir directamente la ruta de búsqueda de Instagram.
        webView.evaluateJavascript(
            "Boolean(window.__calmaOpenSearch && window.__calmaOpenSearch())", result -> {
                if (webView != null && !"true".equals(result)) go(SEARCH);
            });
    }

    private void showOptions() {
        if (publishingMode) {
            String[] options = {"Reintentar abrir Crear (+)", "Volver a Mensajes",
                                "Abrir Instagram en Firefox"};
            new AlertDialog.Builder(this).setTitle("Calma · modo publicación")
                .setItems(options, (dialog, choice) -> {
                    switch (choice) {
                        case 0:
                            createAttempts = 0;
                            createPending = true;
                            attemptOpenComposer();
                            break;
                        case 1: confirmLeavePublishing(INBOX); break;
                        case 2: openFirefox(); break;
                    }
                }).setNegativeButton("Cerrar", null).show();
            return;
        }
        String[] options = {
            "Ver perfil del usuario actual", "Crear publicación (+)",
            "¿Qué bloquea Calma?", "Volver a Mensajes", "Abrir Instagram en Firefox",
            "Limpiar sesión de este cliente"
        };
        new AlertDialog.Builder(this).setTitle("Calma · opciones")
            .setItems(options, (dialog, choice) -> {
                switch (choice) {
                    case 0: openSelectedProfile(); break;
                    case 1: onPublishButton(); break;
                    case 2: showAbout(); break;
                    case 3: go(INBOX); break;
                    case 4: openFirefox(); break;
                    case 5: confirmLogout(); break;
                }
            }).setNegativeButton("Cerrar", null).show();
    }
    private void showAbout() {
        new AlertDialog.Builder(this)
            .setTitle("Usá Instagram, no el algoritmo")
            .setMessage("✓ Mensajes directos\n✓ Buscador de Instagram\n✓ Perfiles visitados y autores de publicaciones\n" +
                "✓ Crear publicaciones mediante la web de Instagram\n" +
                "✓ Un solo video compartido por chat, con sonido\n" +
                "✓ Inicio de sesión directamente en Instagram\n\n" +
                "✕ Catálogo de Reels\n✕ Explorar\n✕ Historias encadenadas\n" +
                "✕ Inicio infinito\n✕ Recomendaciones visibles\n" +
                "✕ Enlaces que intenten instalar Instagram\n\n" +
                "Calma no posee servidores ni accede a tus contraseñas. " +
                "Los filtros visuales son de mejor esfuerzo y pueden dejar de funcionar " +
                "si Instagram cambia su web. No ofrece notificaciones en segundo plano.")
            .setPositiveButton("Entendido", null).show();
    }
    private void openFirefox() {
        Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(INBOX));
        i.addCategory(Intent.CATEGORY_BROWSABLE);
        try {
            i.setPackage("org.mozilla.firefox");
            startActivity(i);
        } catch (ActivityNotFoundException ex) {
            i.setPackage(null);
            try { startActivity(i); }
            catch (ActivityNotFoundException ignored) {
                Toast.makeText(this, "Instalá Firefox para la opción alternativa", Toast.LENGTH_LONG).show();
            }
        }
    }
    private void confirmLogout() {
        new AlertDialog.Builder(this).setTitle("Cerrar sesión en Calma")
            .setMessage("Se borrarán las cookies y el almacenamiento web local de este cliente. " +
                "No afecta tu cuenta de Instagram ni las sesiones de otros navegadores.")
            .setNegativeButton("Cancelar", null)
            .setPositiveButton("Borrar sesión", (dialog, which) -> {
                CookieManager.getInstance().removeAllCookies(ok -> {
                    CookieManager.getInstance().flush();
                    webView.clearCache(true);
                    webView.clearHistory();
                    android.webkit.WebStorage.getInstance().deleteAllData();
                    webView.loadUrl(INBOX);
                });
            }).show();
    }
    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == PICK_FILE && fileCallback != null) {
            Uri[] result = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
            // Aceptar sólo URIs documentadas por el selector de Android, no file://
            // ni rutas internas que un selector no confiable pueda retornar.
            if (result != null) {
                java.util.ArrayList<Uri> safe = new java.util.ArrayList<>();
                for (Uri uri : result) {
                    if (uri != null && "content".equalsIgnoreCase(uri.getScheme()) &&
                        !getPackageName().equals(uri.getAuthority())) safe.add(uri);
                }
                result = safe.isEmpty() ? null : safe.toArray(new Uri[0]);
            }
            fileCallback.onReceiveValue(result);
            fileCallback = null;
        }
    }
    @Override public void onBackPressed() {
        if (webView != null && mayOpenProfileStory(Uri.parse(webView.getUrl() == null ? "" : webView.getUrl()).getPath())) {
            allowedProfileStoryPath = "";
            webView.loadUrl(returnProfileUrl);
            return;
        }
        if (clipActive && webView != null) {
            webView.evaluateJavascript("window.__calmaClipClose?.();", null);
            return;
        }
        if (webView != null && webView.canGoBack()) {
            clearSharedClip();
            webView.goBack();
        }
        else new AlertDialog.Builder(this).setTitle("Cerrar Calma")
             .setMessage("¿Salir del cliente?")
             .setNegativeButton("Seguir", null)
             .setPositiveButton("Salir", (d, w) -> finish()).show();
    }
    @Override protected void onPause() {
        handler.removeCallbacks(pollContext);
        super.onPause();
        if (webView != null) webView.onPause();
    }
    @Override protected void onResume() {
        super.onResume();
        if (webView != null) webView.onResume();
        handler.removeCallbacks(pollContext);
        handler.post(pollContext);
    }
    @Override protected void onDestroy() {
        handler.removeCallbacks(pollContext);
        clearSharedClip();
        if (fileCallback != null) { fileCallback.onReceiveValue(null); fileCallback = null; }
        if (webView != null) {
            contentFrame.removeView(webView);
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
