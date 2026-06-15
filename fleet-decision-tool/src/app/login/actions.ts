"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";

/** Server action: verify credentials and start a session, then redirect home. */
export async function authenticate(
  _prev: string | undefined,
  formData: FormData
): Promise<string | undefined> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) return "Correo o contraseña inválidos.";
    throw error; // re-throw the NEXT_REDIRECT on success
  }
}
