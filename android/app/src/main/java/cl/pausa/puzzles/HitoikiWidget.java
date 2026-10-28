package cl.pausa.puzzles;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.res.Configuration;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.RectF;
import android.graphics.Typeface;
import android.widget.RemoteViews;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import org.json.JSONObject;

/**
 * Home screen widget: today's ensō (one stroke per solved puzzle) and the streak.
 * The web app writes {date, done, streak, validThrough} to Preferences key "widget"
 * (SharedPreferences "CapacitorStorage") and asks for a refresh; the widget also refreshes every
 * 30 minutes so a new day starts empty even if the app isn't opened.
 */
public class HitoikiWidget extends AppWidgetProvider {
    private static final int REQUIRED = 4;

    @Override
    public void onUpdate(Context ctx, AppWidgetManager manager, int[] ids) {
        for (int id : ids) manager.updateAppWidget(id, build(ctx));
    }

    public static void updateAll(Context ctx) {
        AppWidgetManager manager = AppWidgetManager.getInstance(ctx);
        int[] ids = manager.getAppWidgetIds(new ComponentName(ctx, HitoikiWidget.class));
        for (int id : ids) manager.updateAppWidget(id, build(ctx));
    }

    static RemoteViews build(Context ctx) {
        String today = new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
        int done = 0;
        int streak = 0;
        try {
            SharedPreferences prefs = ctx.getSharedPreferences("CapacitorStorage", Context.MODE_PRIVATE);
            JSONObject data = new JSONObject(prefs.getString("widget", "{}"));
            if (today.equals(data.optString("date"))) done = Math.min(REQUIRED, data.optInt("done"));
            // The streak is still alive while today is not past the last day it can be saved.
            String valid = data.optString("validThrough", "");
            if (!valid.isEmpty() && today.compareTo(valid) <= 0) streak = data.optInt("streak");
        } catch (Exception ignored) {
            // no data yet: an empty day
        }

        boolean night = (ctx.getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
        RemoteViews views = new RemoteViews(ctx.getPackageName(), R.layout.widget_hitoiki);
        views.setImageViewBitmap(R.id.widget_enso, enso(ctx, done, night));
        int left = REQUIRED - done;
        String title = done >= REQUIRED ? "Día completo" : done == 0 ? "Tu respiro de hoy" : left == 1 ? "¡Falta uno!" : "Te faltan " + left;
        String sub = streak > 0 ? "🔥 Racha de " + streak + (streak == 1 ? " día" : " días") : "Resuelve " + REQUIRED + " para empezar una racha";
        views.setTextViewText(R.id.widget_title, title);
        views.setTextViewText(R.id.widget_sub, sub);
        views.setContentDescription(R.id.widget_enso, done + " de " + REQUIRED + " puzzles hoy");

        Intent open = new Intent(ctx, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        PendingIntent pi = PendingIntent.getActivity(ctx, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_root, pi);
        return views;
    }

    /** The day's ensō: four brush strokes, filled in vermilion as puzzles are solved. */
    static Bitmap enso(Context ctx, int done, boolean night) {
        float d = ctx.getResources().getDisplayMetrics().density;
        int size = Math.round(64 * d);
        int shu = night ? 0xFFE0654A : 0xFFCF4B2F;
        int line = night ? 0xFF36312B : 0xFFE2D9C9;
        int ink = night ? 0xFFEFE8DC : 0xFF2A2622;
        Bitmap bmp = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
        Canvas c = new Canvas(bmp);
        Paint p = new Paint(Paint.ANTI_ALIAS_FLAG);
        p.setStyle(Paint.Style.STROKE);
        p.setStrokeCap(Paint.Cap.ROUND);
        float stroke = 5.5f * d;
        RectF oval = new RectF(stroke, stroke, size - stroke, size - stroke);
        c.save();
        c.rotate(-4, size / 2f, size / 2f);
        float gap = 12.6f;
        for (int i = 0; i < REQUIRED; i++) {
            boolean filled = i < done;
            p.setColor(filled ? shu : line);
            p.setStrokeWidth(filled ? stroke * (i % 2 == 0 ? 1f : 0.88f) : stroke * 0.55f);
            c.drawArc(oval, -90 + 7 + i * 90 + gap / 2, 90 - gap, false, p);
        }
        c.restore();

        Paint t = new Paint(Paint.ANTI_ALIAS_FLAG);
        t.setTextAlign(Paint.Align.CENTER);
        t.setTypeface(Typeface.create(Typeface.SERIF, Typeface.BOLD));
        if (done >= REQUIRED) {
            t.setColor(shu);
            t.setTextSize(26 * d);
            c.drawText("済", size / 2f, size / 2f + 9 * d, t);
        } else {
            t.setColor(ink);
            t.setTextSize(24 * d);
            c.drawText(String.valueOf(done), size / 2f, size / 2f + 6 * d, t);
            t.setTypeface(Typeface.DEFAULT);
            t.setTextSize(8.5f * d);
            t.setColor(night ? 0xFFB0A698 : 0xFF6F6559);
            c.drawText("de " + REQUIRED, size / 2f, size / 2f + 17 * d, t);
        }
        return bmp;
    }
}
