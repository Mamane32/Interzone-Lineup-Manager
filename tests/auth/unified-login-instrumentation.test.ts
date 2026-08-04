import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  signIn: async (): Promise<{ data: { user: { id: string } | null }; error: unknown }> => ({
    data: { user: { id: "user-1" } },
    error: null,
  }),
  resolveUserDestination: async (): Promise<unknown> => ({ kind: "redirect", path: "/admin/dashboard" }),
}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: (...args: unknown[]) => state.signIn(...(args as [])),
    },
  }),
}));

vi.mock("@/lib/access", () => ({
  resolveUserDestination: (...args: unknown[]) => state.resolveUserDestination(...(args as [])),
}));

import { unifiedLogin } from "@/app/login/actions";

function formDataFor(email: string, password: string) {
  const fd = new FormData();
  fd.set("email", email);
  fd.set("password", password);
  return fd;
}

describe("unifiedLogin exception instrumentation", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    state.signIn = async () => ({ data: { user: { id: "user-1" } }, error: null });
    state.resolveUserDestination = async () => ({ kind: "redirect", path: "/admin/dashboard" });
  });

  it("redirects to signin-exception when signInWithPassword throws a non-AuthError exception", async () => {
    state.signIn = async () => {
      throw new Error("raw exception, not wrapped as {error}");
    };

    await expect(unifiedLogin(formDataFor("a@b.com", "pw"))).rejects.toThrow(
      "REDIRECT:/login?error=signin-exception"
    );
  });

  it("still redirects to error=invalid for a normal wrong-password rejection (no throw)", async () => {
    state.signIn = async () => ({ data: { user: null }, error: { message: "Invalid credentials" } });

    await expect(unifiedLogin(formDataFor("a@b.com", "wrong"))).rejects.toThrow("REDIRECT:/login?error=invalid");
  });

  it("redirects to resolve-exception when resolveUserDestination throws", async () => {
    state.resolveUserDestination = async () => {
      throw new Error("supabaseAdmin misconfiguration or similar");
    };

    await expect(unifiedLogin(formDataFor("a@b.com", "pw"))).rejects.toThrow(
      "REDIRECT:/login?error=resolve-exception"
    );
  });

  it("still redirects to the resolved destination on the normal happy path", async () => {
    await expect(unifiedLogin(formDataFor("a@b.com", "pw"))).rejects.toThrow("REDIRECT:/admin/dashboard");
  });

  it("redirects to a stage-specific code when resolveUserDestination throws a tagged error", async () => {
    state.resolveUserDestination = async () => {
      throw new Error("[resolveUserDestination:getProfile] boom");
    };

    await expect(unifiedLogin(formDataFor("a@b.com", "pw"))).rejects.toThrow(
      "REDIRECT:/login?error=resolve-exception-getProfile"
    );
  });
});
