package cl.pausa.puzzles;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Local plugin that lets the web app refresh the home screen widget.
        registerPlugin(WidgetPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
