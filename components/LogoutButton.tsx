import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function LogoutButton() {
  const handleLogout = async () => {
    try {
      await signOut(auth);
      window.location.href = "/login";
    } catch (error) {
      console.error("ログアウト失敗:", error);
    }
  };

  return (
    <button onClick={handleLogout} className="px-3 py-1.5 text-sm rounded bg-gray-800 hover:bg-gray-700">
      ログアウト
    </button>
  );
}
