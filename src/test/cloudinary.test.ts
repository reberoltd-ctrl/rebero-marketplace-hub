import { describe, expect, it } from "vitest";
import { cldSrcSet, cldUrl, isCloudinaryUrl, validateMedia } from "@/lib/cloudinary";

const SRC = "https://res.cloudinary.com/ifjvmqup/image/upload/v1795493639/rebero/products/abc.jpg";

describe("Cloudinary delivery", () => {
  it("adds automatic format and quality to Cloudinary images", () => {
    expect(cldUrl(SRC)).toBe("https://res.cloudinary.com/ifjvmqup/image/upload/f_auto,q_auto/v1795493639/rebero/products/abc.jpg");
  });

  it("resizes square product photos with a fill crop", () => {
    expect(cldUrl(SRC, { width: 400, aspectRatio: "1:1" })).toBe(
      "https://res.cloudinary.com/ifjvmqup/image/upload/f_auto,q_auto,w_400,ar_1:1,c_fill/v1795493639/rebero/products/abc.jpg",
    );
  });

  it("does not stack transformations when applied twice", () => {
    expect(cldUrl(cldUrl(SRC, { width: 200 }), { width: 800 })).toBe(
      "https://res.cloudinary.com/ifjvmqup/image/upload/f_auto,q_auto,w_800,c_limit/v1795493639/rebero/products/abc.jpg",
    );
  });

  it("leaves older non-Cloudinary links untouched", () => {
    expect(cldUrl("/api/public/media/product-images/u/x.jpg", { width: 400 })).toBe("/api/public/media/product-images/u/x.jpg");
    expect(isCloudinaryUrl("https://res.cloudinary.com/someoneelse/image/upload/x.jpg")).toBe(false);
    expect(cldSrcSet("/x.jpg", [200, 400])).toBeUndefined();
  });

  it("only accepts JPG, PNG or WebP photos up to 5 MB", () => {
    expect(validateMedia({ type: "image/jpeg", size: 5 * 1024 * 1024 })).toBeNull();
    expect(validateMedia({ type: "image/jpeg", size: 5 * 1024 * 1024 + 1 })).not.toBeNull();
    expect(validateMedia({ type: "image/gif", size: 1000 })).not.toBeNull();
  });
});
