package android.annotation;
import java.lang.annotation.*;
@Retention(RetentionPolicy.SOURCE) @Target({ElementType.TYPE, ElementType.METHOD, ElementType.CONSTRUCTOR, ElementType.FIELD})
public @interface SuppressLint { String[] value(); }
