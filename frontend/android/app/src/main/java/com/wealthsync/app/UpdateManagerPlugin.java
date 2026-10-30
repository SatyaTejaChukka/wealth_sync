package com.wealthsync.app;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.Settings;
import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

@CapacitorPlugin(name = "UpdateManager")
public class UpdateManagerPlugin extends Plugin {

    @PluginMethod
    public void getAppVersion(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("versionCode", BuildConfig.VERSION_CODE);
        ret.put("versionName", BuildConfig.VERSION_NAME);
        ret.put("packageName", getContext().getPackageName());
        call.resolve(ret);
    }

    @PluginMethod
    public void canInstallPackages(PluginCall call) {
        boolean canInstall = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            canInstall = getContext().getPackageManager().canRequestPackageInstalls();
        }
        JSObject ret = new JSObject();
        ret.put("canInstall", canInstall);
        call.resolve(ret);
    }

    @PluginMethod
    public void openInstallPermissionSettings(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
        }
        call.resolve();
    }

    @PluginMethod
    public void installApk(PluginCall call) {
        String filePath = call.getString("filePath");
        if (filePath == null || filePath.isEmpty()) {
            call.reject("File path must not be empty");
            return;
        }

        File apkFile = new File(filePath);
        if (!apkFile.exists()) {
            call.reject("APK file does not exist at specified path");
            return;
        }

        try {
            triggerInstallIntent(apkFile);
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to launch package installer: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        String downloadUrl = call.getString("downloadUrl");
        if (downloadUrl == null || downloadUrl.isEmpty()) {
            call.reject("Download URL must not be empty");
            return;
        }

        new Thread(() -> {
            HttpURLConnection connection = null;
            InputStream input = null;
            FileOutputStream output = null;

            try {
                URL url = new URL(downloadUrl);
                connection = (HttpURLConnection) url.openConnection();
                connection.setConnectTimeout(15000);
                connection.setReadTimeout(30000);
                connection.setRequestProperty("User-Agent", "WealthSync-Android-Updater");
                connection.connect();

                int fileLength = connection.getContentLength();

                File dir = getContext().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                if (dir == null) {
                    dir = getContext().getCacheDir();
                }

                File outputFile = new File(dir, "wealthsync-update.apk");
                if (outputFile.exists()) {
                    outputFile.delete();
                }

                input = connection.getInputStream();
                output = new FileOutputStream(outputFile);

                byte[] data = new byte[8192];
                long total = 0;
                int count;
                long lastProgressUpdate = 0;

                while ((count = input.read(data)) != -1) {
                    total += count;
                    output.write(data, 0, count);

                    long now = System.currentTimeMillis();
                    if (now - lastProgressUpdate > 200 || total == fileLength) {
                        lastProgressUpdate = now;
                        int percent = fileLength > 0 ? (int) ((total * 100) / fileLength) : -1;
                        JSObject progressData = new JSObject();
                        progressData.put("bytesDownloaded", total);
                        progressData.put("totalBytes", fileLength);
                        progressData.put("percent", percent);
                        notifyListeners("downloadProgress", progressData);
                    }
                }

                output.flush();

                // Notify completion
                JSObject completeData = new JSObject();
                completeData.put("filePath", outputFile.getAbsolutePath());
                notifyListeners("downloadComplete", completeData);

                // Launch package installer
                triggerInstallIntent(outputFile);

                JSObject result = new JSObject();
                result.put("success", true);
                result.put("filePath", outputFile.getAbsolutePath());
                call.resolve(result);

            } catch (Exception e) {
                JSObject errorData = new JSObject();
                errorData.put("error", e.getMessage());
                notifyListeners("downloadError", errorData);
                call.reject("Download failed: " + e.getMessage(), e);
            } finally {
                try {
                    if (output != null) output.close();
                    if (input != null) input.close();
                    if (connection != null) connection.disconnect();
                } catch (Exception ignored) {}
            }
        }).start();
    }

    private void triggerInstallIntent(File apkFile) {
        Context context = getContext();
        String authority = context.getPackageName() + ".fileprovider";
        Uri contentUri = FileProvider.getUriForFile(context, authority, apkFile);

        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(contentUri, "application/vnd.android.package-archive");
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        context.startActivity(intent);
    }
}
