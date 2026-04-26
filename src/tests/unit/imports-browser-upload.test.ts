import { describe, expect, it, vi } from "vitest";
import { uploadStagedImportFile } from "@/lib/imports/browser-upload";

describe("imports browser upload", () => {
  it("uploads bytes through the signed private staged import contract", async () => {
    const uploadToSignedUrl = vi.fn(async () => ({
      data: {
        path: "user-1/receipt_image/2026/04/receipt.jpg",
        fullPath: "staged-imports/user-1/receipt_image/2026/04/receipt.jpg",
      },
      error: null,
    }));

    const file = new File(["receipt"], "receipt.jpg", { type: "image/jpeg" });

    const result = await uploadStagedImportFile(
      {
        bucket: "staged-imports",
        storagePath: "user-1/receipt_image/2026/04/receipt.jpg",
        uploadToken: "token-receipt",
        file,
      },
      {
        createBrowserClient: vi.fn(() => ({
          storage: {
            from: vi.fn(() => ({
              uploadToSignedUrl,
            })),
          },
        })) as never,
      },
    );

    expect(uploadToSignedUrl).toHaveBeenCalledWith(
      "user-1/receipt_image/2026/04/receipt.jpg",
      "token-receipt",
      file,
      {
        contentType: "image/jpeg",
        upsert: false,
      },
    );
    expect(result).toEqual({
      path: "user-1/receipt_image/2026/04/receipt.jpg",
      fullPath: "staged-imports/user-1/receipt_image/2026/04/receipt.jpg",
    });
  });

  it("surfaces a clean error when signed upload fails", async () => {
    const file = new File(["csv"], "statement.csv", { type: "text/csv" });

    await expect(
      uploadStagedImportFile(
        {
          bucket: "staged-imports",
          storagePath: "user-1/csv_import/2026/04/statement.csv",
          uploadToken: "token-csv",
          file,
        },
        {
          createBrowserClient: vi.fn(() => ({
            storage: {
              from: vi.fn(() => ({
                uploadToSignedUrl: vi.fn(async () => ({
                  data: null,
                  error: {
                    message: "Signed upload failed.",
                  },
                })),
              })),
            },
          })) as never,
        },
      ),
    ).rejects.toThrow("Signed upload failed.");
  });
});
