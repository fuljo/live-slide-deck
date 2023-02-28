import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, GoogleAuthProvider, signInWithRedirect } from 'firebase/auth';

import { firebaseConfig } from './common';

import '../scss/login.scss';

// Main
window.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");
    const loginButton = document.getElementById("loginButton");
    const googleLoginButton = document.getElementById("googleLoginButton");
    const loginMessage = document.getElementById("loginMessage");
    const loginError = document.getElementById("loginError");

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);

    auth.onAuthStateChanged((user) => {
        if (user) {
            // Signed in
            loginMessage.textContent = `Signed in as ${user.email}. Redirecting...`;
            loginMessage.hidden = false;
            loginForm.hidden = true;
            loginError.hidden = true;
            window.location.replace("admin");
        }
    });

    loginButton.addEventListener("click", async (e) => {
        e.preventDefault();

        const email = loginForm.email.value;
        const password = loginForm.password.value;

        signInWithEmailAndPassword(auth, email, password).catch((error) => {
            loginError.textContent = error.message;
            loginError.hidden = false;
        });
    });

    googleLoginButton.addEventListener("click", async (e) => {
        e.preventDefault();

        const provider = new GoogleAuthProvider();
        auth.useDeviceLanguage();

        signInWithRedirect(auth, provider).catch((error) => {
            loginError.textContent = error.message;
            loginError.hidden = false;
        });
    });
});
