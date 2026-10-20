import StudyApp from "./study-app";
import { getChatGPTUser } from "./chatgpt-auth";
export const dynamic = "force-dynamic";
export default async function Home() {
  const user = await getChatGPTUser();
  return (
    <StudyApp
      user={
        user
          ? { id: user.userId, name: user.fullName ?? user.email.split("@")[0] }
          : null
      }
    />
  );
}
