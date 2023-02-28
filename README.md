# Live Slide Deck

Present PDFs live on the web.

This web application allows you to upload PDF documents and present them online to any number of users. The viewers will see the slides advance in real time.

## Features:
- **Admin view**: select a slide deck and advance the presentation.
- **Real time sync**: the users will see the slides changing in real time.
- Access control: only authorized users can control the presentation through the admin panel.
- Multiple decks: you can upload multiple decks and select the one to show at each time.
- Wake Lock: prevent the viewer's screen from dimming or locking during the presentation (only on [supported browsers](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API#browser_compatibility))
- Preserve last shown page when switching decks.

## Getting started

The app is entirely built for [Firebase](firebase.google.com).

1. Clone the repository
   ```sh
   git clone https://github.com/fuljo/live-slide-deck
   cd live-slide-deck
   ```

### Setting up Firebase

1. Register to Firebase and set up a new project. We will reference it as `${FIREBASE_PROJECT_ID}` from now on.

2. Install the Firebase CLI as described [here](https://firebase.google.com/docs/cli#install_the_firebase_cli) and log in to your Google account.
   ```sh
   npm install -g firebase-tools
   firebase login
   ```

3. Set the current project
   ```sh
   firebase use ${FIREBASE_PROJECT_ID}
   ```

4. Create a web application
   ```sh
   firebase apps:create web ${FIREBASE_PROJECT_ID}
   ```

5. Firestore, hosting and storage are already configured for you :wink:.

### Setting up Authentication

Authentication is only needed to sign-in the presenters (those who control the presentation). The viewer is publicly accessible.

1. Go to the [Authentication > Sign-in-method](https://console.firebase.google.com/project/_/authentication/providers) tab in your Firebase console.
   
   - Enable the *Email/Password* provider.

   - Enable the *Google* provider (optional).

2. Go to the [Authentication > Settings](https://console.firebase.google.com/project/_/authentication/settings) tab.

   - Turn on *User account linking*.
   - Go to *User actions* and when prompted enable authentication with the [identity platform](https://firebase.google.com/docs/auth#identity-platform). This will decrease the number of daily active users to 3,000. But since only presenters are counted it is not a problem for us.
   - In *User actions* uncheck *Enable create*, so that no users can sign up using the public API.

3. Go to the [Authentication > Users](https://console.firebase.google.com/project/_/authentication/users) tab.
   - Create a user for each of your intended presenters. If you intend to use Google sign-in, you can use a generated throw-away password.

4. Go to the [Firestore > Data](https://console.firebase.google.com/project/_/firestore/data) tab.
   - Create a collection called `users`.
   - Inside it, create a document for each of your presenters.
   - The document key is the user's UID which you can retrieve from the [Authentication > Users](https://console.firebase.google.com/project/_/authentication/users) tab.
   - The document must have two fields:
     - `email: string` with the user's email (only for reference).
     - `admin: bool = true` which grants the user permissions to modify the presenter's state.

### Setting up the presenter's state

1. Go to the [Firestore > Data](https://console.firebase.google.com/project/_/firestore/data) tab.

   - Create a collection called `presenter`.
   - Inside it, create a document called `state` with two fields:
     - `currentDeck: string` set to the name of your slide deck, without the `.pdf` extension.
     - `currentPageNumber: map = {}}` -- this will hold a map that associates each slide deck with the current page number.

### Setting up the storage

1. Go to the [Storage > Files](https://console.firebase.google.com/project/_/storage/) tab.

2. Create a folder named `decks`.

3. Inside it, upload your PDF slide decks.

4. Last, we need to configure CORS on the bucket to allow downloads from any site. Follow the procedure described [here](https://firebase.google.com/docs/storage/web/download-files#cors_configuration). The `cors.json` file is already provided for you.
   ```json
   [
      {
         "origin": ["*"],
         "method": ["GET"],
         "maxAgeSeconds": 3600
      }
   ]
   ```

5. If you want additional protection you can replace the `"*"` origin with `"${FIREBASE_PROJECT_ID}.firebaseapp.com"`, but please mind that requests from `localhost` (e.g. in development) won't work in this case.
   
### Retrieving the app's configuration variables

Now you need to locally store your app's configuration that Webpack can pick them up when building the app.

1. Go to your project's [Settings > General](https://console.firebase.google.com/project/_/settings/general) tab.

2. Scroll down until you see a code snippet including
   ```js
   const firebaseConfig = { /* ... */ };
   ```
   which contains your configuration.
3. In the project root run `cp .env.example .env` and fill the fields of the former file using the configuration values above.

### Build and deploy

1. Install dependencies
   ```sh
   npm install
   ```

2. Build and deploy to your Firebase site
   ```sh
   firebase deploy
   ```

3. Visit the site: `https://${FIREBASE_PROJECT_ID}.firebaseapp.com/`

## Usage

### Viewer page

The viewer page is served at the root of the site (`index`).
It features a full-page view of the current slide. Users can toggle the fullscreen mode by double-tapping the screen.

### Admin page

The admin page is served at `/admin`. It allows authenticated admin users to:
- select the current slide deck with the top-left dropdown
- change the current slide number with the center input field
- go to the previous/next slide with the on-screen buttons or the keyboard arrows

## Contributing

I ([fuljo](https://github.com/fuljo)) quickly hacked this app for the [SWERC 2022-2023](https://swerc.eu/2022/about) event. It lacks a lot of front-end features and is still far from perfect. Some future improvements I suggest:

- [ ]  Uploading slide decks through the Admin UI
- [ ]  Managing the users from the UI
- [ ]  Multiple presentation sessions

If you wish to contribute please open a *Pull Request*.

## 3rd-party libraries

This project relies on:
- [Firebase](https://firebase.google.com/) for database, authentication, storage and hosting.
- [Webpack](https://webpack.js.org/) for building.
- [PDF.js](https://mozilla.github.io/pdf.js/) for in-browser PDF rendering.
- [Bootstrap](https://getbootstrap.com/) for theming and icons.