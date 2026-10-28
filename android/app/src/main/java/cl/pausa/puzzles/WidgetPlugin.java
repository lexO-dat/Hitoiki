package cl.pausa.puzzles;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Called from the web app after it saves new widget data (Preferences key "widget"). */
@CapacitorPlugin(name = "HitoikiWidget")
public class WidgetPlugin extends Plugin {
    @PluginMethod
    public void refresh(PluginCall call) {
        HitoikiWidget.updateAll(getContext());
        call.resolve();
    }
}
