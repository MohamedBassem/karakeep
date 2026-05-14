/* eslint-disable @next/next/no-img-element -- this component is our replacement for next/image */
"use client";

import { forwardRef } from "react";
import type { CSSProperties, ImgHTMLAttributes } from "react";
import { getSizes, getSrcSet, getStyle } from "@unpic/core/base";

import {
  isKarakeepAssetUrl,
  karakeepImageTransformer,
} from "@/lib/imageTransformer";

type BaseImgProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "src" | "width" | "height" | "loading" | "srcSet"
>;

interface FillImage {
  /** Stretch the image to fill its (positioned) parent — `next/image`-style. */
  fill: true;
  width?: never;
  height?: never;
  aspectRatio?: never;
}

interface FixedImage {
  fill?: false;
  width: number;
  height: number;
  aspectRatio?: never;
}

interface ConstrainedImage {
  fill?: false;
  width: number;
  height?: never;
  aspectRatio: number;
}

interface FullWidthImage {
  fill?: false;
  width?: never;
  height?: never;
  aspectRatio?: number;
}

export type ImageProps = BaseImgProps & {
  src: string;
  alt: string;
  priority?: boolean;
  /**
   * Hint of the rendered width in CSS pixels, used to pick srcset
   * breakpoints when `fill` is set. Defaults to a reasonable card width.
   */
  sizeHint?: number;
} & (FillImage | FixedImage | ConstrainedImage | FullWidthImage);

const FILL_STYLE: CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
};

/**
 * Image component backed by `@unpic/core`, wired up to our karakeep asset
 * endpoint. Drop-in for the subset of `next/image` features we actually use.
 *
 * For URLs that don't point at `/api/assets/...` (favicons, data: URIs,
 * `/blur.avif`) it skips transformation and renders a plain `<img>`.
 */
const Image = forwardRef<HTMLImageElement, ImageProps>(
  function Image(props, ref) {
    const {
      src,
      alt,
      priority,
      sizeHint,
      fill,
      width,
      height,
      aspectRatio,
      style,
      className,
      ...rest
    } = props as ImageProps & {
      width?: number;
      height?: number;
      aspectRatio?: number;
      fill?: boolean;
    };

    if (!isKarakeepAssetUrl(src)) {
      const fillStyle = fill ? { ...FILL_STYLE, ...style } : style;
      return (
        <img
          ref={ref}
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : undefined}
          style={fillStyle}
          className={className}
          width={fill ? undefined : width}
          height={fill ? undefined : height}
          {...rest}
        />
      );
    }

    const layout: "fullWidth" | "fixed" | "constrained" = fill
      ? "fullWidth"
      : width !== undefined && height !== undefined
        ? "fixed"
        : "constrained";
    const effectiveWidth = fill ? (sizeHint ?? 1024) : width;
    const effectiveHeight = fill ? undefined : height;
    const effectiveAspect = fill ? undefined : aspectRatio;

    const srcSet = getSrcSet({
      src,
      width: effectiveWidth,
      height: effectiveHeight,
      aspectRatio: effectiveAspect,
      layout,
      transformer: karakeepImageTransformer,
    });

    const sizes = getSizes(effectiveWidth, layout);

    const baseStyle = getStyle({
      width: effectiveWidth,
      height: effectiveHeight,
      aspectRatio: effectiveAspect,
      layout,
    }) as CSSProperties | undefined;

    const transformedSrc = karakeepImageTransformer(src, {
      width: effectiveWidth,
      height: effectiveHeight,
    });

    const mergedStyle: CSSProperties = {
      ...baseStyle,
      ...(fill ? FILL_STYLE : {}),
      ...style,
    };

    return (
      <img
        ref={ref}
        src={transformedSrc}
        srcSet={srcSet}
        sizes={sizes ?? undefined}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={priority ? "high" : undefined}
        style={mergedStyle}
        className={className}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        {...rest}
      />
    );
  },
);

export default Image;
