package com.aightbet.app;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.widget.RelativeLayout;
import androidx.coordinatorlayout.widget.CoordinatorLayout;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String ADMOB_AD_VIEW_CLASS = "com.google.android.gms.ads.AdView";
    private boolean adMobInsetsOverrideInstalled = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        configureEdgeToEdgeWindow();
        watchForAdMobBanner();
    }

    private void configureEdgeToEdgeWindow() {
        Window window = getWindow();

        // Let native views draw into the gesture/navigation area. The AdMob
        // plugin adds a bottom inset on Android 15+, so we remove that below.
        WindowCompat.setDecorFitsSystemWindows(window, false);
        window.setNavigationBarColor(Color.TRANSPARENT);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            window.setNavigationBarDividerColor(Color.TRANSPARENT);
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            window.setNavigationBarContrastEnforced(false);
        }
    }

    private void watchForAdMobBanner() {
        View content = findViewById(android.R.id.content);
        content.getViewTreeObserver().addOnGlobalLayoutListener(this::anchorAdMobBannerToScreenBottom);
        content.post(this::anchorAdMobBannerToScreenBottom);
    }

    private void anchorAdMobBannerToScreenBottom() {
        ViewGroup content = findViewById(android.R.id.content);
        View bannerContainer = findAdMobBannerContainer(content);

        if (bannerContainer == null) {
            return;
        }

        installAdMobInsetsOverride();
        bannerContainer.setFitsSystemWindows(false);
        bannerContainer.setPadding(0, 0, 0, 0);

        ViewGroup.LayoutParams params = bannerContainer.getLayoutParams();

        if (params instanceof ViewGroup.MarginLayoutParams marginParams) {
            marginParams.setMargins(0, 0, 0, 0);
        }

        if (params instanceof CoordinatorLayout.LayoutParams coordinatorParams) {
            coordinatorParams.gravity = Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL;
        }

        if (bannerContainer instanceof RelativeLayout relativeLayout) {
            relativeLayout.setGravity(Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL);
        }

        bannerContainer.setLayoutParams(params);
    }

    private void installAdMobInsetsOverride() {
        if (adMobInsetsOverrideInstalled) {
            return;
        }

        adMobInsetsOverrideInstalled = true;
        getWindow()
            .getDecorView()
            .setOnApplyWindowInsetsListener((view, insets) -> {
                view.post(this::anchorAdMobBannerToScreenBottom);
                return insets;
            });
        getWindow().getDecorView().requestApplyInsets();
    }

    private View findAdMobBannerContainer(View view) {
        if (!(view instanceof ViewGroup viewGroup)) {
            return null;
        }

        for (int i = 0; i < viewGroup.getChildCount(); i++) {
            View child = viewGroup.getChildAt(i);

            if (ADMOB_AD_VIEW_CLASS.equals(child.getClass().getName())) {
                return viewGroup;
            }

            View nestedResult = findAdMobBannerContainer(child);
            if (nestedResult != null) {
                return nestedResult;
            }
        }

        return null;
    }
}
