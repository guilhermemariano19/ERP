package br.com.dmb.tvcompras;

import android.annotation.SuppressLint;
import android.app.AlertDialog;
import android.content.Context;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.ArrayDeque;
import java.util.Deque;

public class MainActivity extends android.app.Activity {
    private static final String PREFS = "dmb_tv_prefs";
    private static final String KEY_URL = "server_url";
    private WebView webView;
    private View errorPanel;
    private TextView errorTitle, errorText;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private String serverUrl;
    private int retrySeconds = 10;
    private int periodicReloadMinutes = 30;
    private boolean pageLoaded = false;
    private final Deque<Long> backPresses = new ArrayDeque<>();

    private final Runnable retryRunnable = new Runnable() {
        @Override public void run() { loadDashboard(); }
    };
    private final Runnable periodicReload = new Runnable() {
        @Override public void run() {
            if (webView != null) webView.reload();
            handler.postDelayed(this, periodicReloadMinutes * 60_000L);
        }
    };

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        setContentView(R.layout.activity_main);
        enterImmersiveMode();
        readDefaultConfig();

        SharedPreferences prefs = getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        serverUrl = prefs.getString(KEY_URL, serverUrl);

        webView = findViewById(R.id.webView);
        errorPanel = findViewById(R.id.errorPanel);
        errorTitle = findViewById(R.id.errorTitle);
        errorText = findViewById(R.id.errorText);

        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setCacheMode(WebSettings.LOAD_NO_CACHE);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        }
        webView.setBackgroundColor(Color.rgb(238,244,249));
        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override public void onPageFinished(WebView view, String url) {
                pageLoaded = true;
                errorPanel.setVisibility(View.GONE);
                webView.setVisibility(View.VISIBLE);
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request != null && request.isForMainFrame()) showConnectionError();
            }
            @SuppressWarnings("deprecation")
            @Override public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                showConnectionError();
            }
        });

        loadDashboard();
        handler.postDelayed(periodicReload, periodicReloadMinutes * 60_000L);
    }

    private void readDefaultConfig() {
        serverUrl = "http://192.168.0.25:3000/tv-compras-almox.html";
        try {
            BufferedReader br = new BufferedReader(new InputStreamReader(getAssets().open("default_config.json")));
            StringBuilder sb = new StringBuilder(); String line;
            while ((line = br.readLine()) != null) sb.append(line);
            JSONObject j = new JSONObject(sb.toString());
            serverUrl = j.optString("serverUrl", serverUrl);
            retrySeconds = Math.max(5, j.optInt("retrySeconds", 10));
            periodicReloadMinutes = Math.max(5, j.optInt("periodicReloadMinutes", 30));
        } catch (Exception ignored) {}
    }

    private void loadDashboard() {
        handler.removeCallbacks(retryRunnable);
        pageLoaded = false;
        errorTitle.setText("Conectando ao DMB Business Center...");
        errorText.setText("Painel de Entregas • nova tentativa automática em caso de falha.");
        errorPanel.setVisibility(View.VISIBLE);
        webView.setVisibility(View.INVISIBLE);
        webView.loadUrl(serverUrl);
        handler.postDelayed(() -> { if (!pageLoaded) showConnectionError(); }, 15_000L);
    }

    private void showConnectionError() {
        pageLoaded = false;
        webView.setVisibility(View.INVISIBLE);
        errorPanel.setVisibility(View.VISIBLE);
        errorTitle.setText("Sem comunicação com o servidor DMB");
        errorText.setText("Verifique a rede. Tentativa automática em " + retrySeconds + " segundos.");
        handler.removeCallbacks(retryRunnable);
        handler.postDelayed(retryRunnable, retrySeconds * 1000L);
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        if (event.getAction() == KeyEvent.ACTION_DOWN && event.getKeyCode() == KeyEvent.KEYCODE_BACK) {
            registerHiddenBackPress();
            return true;
        }
        if (event.getAction() == KeyEvent.ACTION_DOWN && event.getKeyCode() == KeyEvent.KEYCODE_MENU) {
            openHiddenSettings();
            return true;
        }
        return super.dispatchKeyEvent(event);
    }

    private void registerHiddenBackPress() {
        long now = System.currentTimeMillis();
        backPresses.addLast(now);
        while (!backPresses.isEmpty() && now - backPresses.peekFirst() > 5000) backPresses.removeFirst();
        if (backPresses.size() >= 7) {
            backPresses.clear();
            openHiddenSettings();
        }
    }

    private void openHiddenSettings() {
        final EditText input = new EditText(this);
        input.setText(serverUrl);
        input.setSingleLine(true);
        input.setTextSize(16);
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        int pad = (int)(24 * getResources().getDisplayMetrics().density);
        box.setPadding(pad,pad,pad/2,0);
        box.addView(input, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT));

        new AlertDialog.Builder(this)
                .setTitle("Configuração oculta do servidor")
                .setMessage("Use somente para alterar o IP/endereço do DMB Business Center.")
                .setView(box)
                .setNegativeButton("Cancelar", null)
                .setPositiveButton("Salvar e abrir", (d,w) -> {
                    String url = input.getText().toString().trim();
                    if (!url.startsWith("http://") && !url.startsWith("https://")) {
                        Toast.makeText(this,"Endereço inválido",Toast.LENGTH_LONG).show();
                        return;
                    }
                    serverUrl = url;
                    getSharedPreferences(PREFS,MODE_PRIVATE).edit().putString(KEY_URL,url).apply();
                    loadDashboard();
                }).show();
    }

    private void enterImmersiveMode() {
        getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                        | View.SYSTEM_UI_FLAG_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
    }

    @Override protected void onResume() { super.onResume(); enterImmersiveMode(); }
    @Override public void onWindowFocusChanged(boolean hasFocus) { super.onWindowFocusChanged(hasFocus); if (hasFocus) enterImmersiveMode(); }
    @Override protected void onDestroy() { handler.removeCallbacksAndMessages(null); if(webView!=null)webView.destroy(); super.onDestroy(); }
}
