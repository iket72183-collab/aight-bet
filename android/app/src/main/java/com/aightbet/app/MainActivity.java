package com.aightbet.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Fill system navigation bar area with black to match app background
        getWindow().setNavigationBarColor(0xFF0A0A0A);
    }
}
