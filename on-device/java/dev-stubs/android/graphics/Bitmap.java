package android.graphics;

import java.io.OutputStream;

public class Bitmap {
    public enum Config {
        ARGB_8888
    }

    public enum CompressFormat {
        PNG, JPEG, WEBP
    }

    public static Bitmap createBitmap(int w, int h, Config config) {
        throw new RuntimeException("Stub");
    }

    public boolean compress(CompressFormat format, int quality, OutputStream stream) {
        throw new RuntimeException("Stub");
    }

    public void recycle() {
        throw new RuntimeException("Stub");
    }
}
