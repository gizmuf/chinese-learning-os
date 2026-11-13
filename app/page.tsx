import AuthShell from "./auth-shell";
import { getChatGPTUser } from "./chatgpt-auth";
export const dynamic = "force-dynamic";
export default async function Home() {
  const user = await getChatGPTUser();
  return (
    <AuthShell
      initialUser={
        user
          ? {
              id: user.userId,
              name: user.fullName ?? user.email.split("@")[0],
              provider: "chatgpt",
            }
          : null
      }
    />
  );
}
