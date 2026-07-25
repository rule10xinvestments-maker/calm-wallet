package com.calmwallet.app;

import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.webkit.WebView;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import java.util.Locale;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Window window = getWindow();
        WindowCompat.setDecorFitsSystemWindows(window, false);
        window.setStatusBarColor(Color.TRANSPARENT);
        window.setNavigationBarColor(Color.TRANSPARENT);

        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(window, window.getDecorView());
        controller.setAppearanceLightStatusBars(true);
        controller.setAppearanceLightNavigationBars(true);

        View decorView = window.getDecorView();
        ViewCompat.setOnApplyWindowInsetsListener(decorView, (view, insets) -> {
            Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            boolean imeVisible = insets.isVisible(WindowInsetsCompat.Type.ime());
            updateWebSafeArea(systemBars.top, imeVisible ? 0 : systemBars.bottom, imeVisible);
            view.postDelayed(() -> updateWebSafeArea(systemBars.top, imeVisible ? 0 : systemBars.bottom, imeVisible), 500);
            view.postDelayed(() -> updateWebSafeArea(systemBars.top, imeVisible ? 0 : systemBars.bottom, imeVisible), 1500);
            return insets;
        });
        ViewCompat.requestApplyInsets(decorView);
    }

    private void updateWebSafeArea(int topInset, int bottomInset, boolean keyboardOpen) {
        if (getBridge() == null || getBridge().getWebView() == null) {
            return;
        }

        WebView webView = getBridge().getWebView();
        String script = String.format(
            Locale.US,
            "document.documentElement.style.setProperty('--calm-safe-area-top','%dpx');" +
                "document.documentElement.style.setProperty('--calm-safe-area-bottom','%dpx');" +
                "document.documentElement.dataset.capacitorKeyboardOpen='%s';",
            topInset,
            bottomInset,
            keyboardOpen ? "true" : "false"
        );

        webView.post(() -> webView.evaluateJavascript(script, null));
    }
}
