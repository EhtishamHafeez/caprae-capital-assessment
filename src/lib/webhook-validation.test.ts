import { describe, expect, it } from "vitest";
import { isSafeWebhookUrl } from "./webhook-validation";

describe("isSafeWebhookUrl", () => {
  it("accepts a normal public https webhook URL", () => {
    expect(isSafeWebhookUrl("https://hooks.zapier.com/hooks/catch/123456/abcdef/")).toBe(true);
  });

  it("accepts another realistic public webhook host", () => {
    expect(isSafeWebhookUrl("https://hook.us1.make.com/abc123xyz")).toBe(true);
  });

  it("rejects plain http (non-TLS)", () => {
    expect(isSafeWebhookUrl("http://hooks.zapier.com/hooks/catch/123/abc")).toBe(false);
  });

  it("rejects localhost", () => {
    expect(isSafeWebhookUrl("https://localhost:3000/hook")).toBe(false);
  });

  it("rejects loopback IPs", () => {
    expect(isSafeWebhookUrl("https://127.0.0.1/hook")).toBe(false);
    expect(isSafeWebhookUrl("https://[::1]/hook")).toBe(false);
  });

  it("rejects private IPv4 ranges", () => {
    expect(isSafeWebhookUrl("https://10.0.0.5/hook")).toBe(false);
    expect(isSafeWebhookUrl("https://192.168.1.1/hook")).toBe(false);
    expect(isSafeWebhookUrl("https://172.16.0.1/hook")).toBe(false);
    expect(isSafeWebhookUrl("https://172.31.255.255/hook")).toBe(false);
  });

  it("does not false-positive on public IPs that merely start similarly to a private range", () => {
    // 172.32.x.x and 172.15.x.x are outside the 172.16-31 private block.
    expect(isSafeWebhookUrl("https://172.32.0.1/hook")).toBe(true);
    expect(isSafeWebhookUrl("https://172.15.0.1/hook")).toBe(true);
  });

  it("rejects link-local addresses", () => {
    expect(isSafeWebhookUrl("https://169.254.1.1/hook")).toBe(false);
  });

  it("rejects .local and .internal hostnames", () => {
    expect(isSafeWebhookUrl("https://myserver.local/hook")).toBe(false);
    expect(isSafeWebhookUrl("https://api.internal/hook")).toBe(false);
  });

  it("rejects malformed URLs instead of throwing", () => {
    expect(isSafeWebhookUrl("not a url")).toBe(false);
    expect(isSafeWebhookUrl("")).toBe(false);
  });
});
