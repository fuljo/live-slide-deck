import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

import { firebaseConfig } from './common';

import 'bootstrap/scss/bootstrap.scss';
import 'bootstrap-icons/font/bootstrap-icons.css';
import '../scss/login.scss';

// Main
window.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");
    const loginButton = document.getElementById("loginButton");
    const loginError = document.getElementById("loginError");

    const app = initializeApp(firebaseConfig);

    loginButton.addEventListener("click", async (e) => {
        e.preventDefault();

        const email = loginForm.email.value;
        const password = loginForm.password.value;

        const auth = getAuth(app);
        signInWithEmailAndPassword(auth, email, password).then((userCredential) => {
            // Signed in
            const user = userCredential.user;
            loginError.hidden = true;
            window.location.replace("admin.html");
        })
        .catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
            loginError.textContent = `${errorCode}: ${errorMessage}`;
            loginError.hidden = false;
        });
    });
});
