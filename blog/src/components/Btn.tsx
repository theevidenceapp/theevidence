import { useState } from "react";
import { API_URL } from "astro:env/client"

function Btn() {
  const [count, setCount] = useState(0);

  function handleGoogleRedirect() {
    window.location.href = `${API_URL}/user/auth/google`
  }

  return (
    <button onClick={handleGoogleRedirect}>
      Sign In with Google
    </button>
  );
}

export default Btn;