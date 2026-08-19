import passport from "passport";
import { Strategy as GoogleStrategy, Profile } from "passport-google-oauth20";
import User from "../models/user.model.js";
import { OAuthError } from "../utils/OAuthError.js";
import config from "../config/config.js";

passport.deserializeUser((id: string, done) => {
  User.findById(id)
    .then((user) => {
      done(null, user);
    })
    .catch((err) => {
      console.error("Error during deserializeUser:", err);
      done(err);
    });
});

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.use(
  new GoogleStrategy(
    {
      clientID: config.GOOGLE_CLIENT_ID as string,
      clientSecret: config.GOOGLE_CLIENT_SECRET as string,
      callbackURL: config.GOOGLE_CALLBACK_URL as string,
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    async (
      accessToken: string,
      refreshToken: string,
      profile: Profile,
      done: (error: any, user?: any, info?: any) => void,
    ) => {
      const { _json } = profile as any;
      const email = profile.emails?.[0].value;
      if (!email) {
        return done(
          null,
          false,
          new OAuthError("EMAIL_NOT_AVAILABLE", "Email not provided by Google"),
        );
      }

      let user = await User.findOne({ googleId: profile.id });
      if (user) {
        return done(null, user);
      }

      user = await User.findOne({ email });

      if (user) {
        user.googleId = profile.id;
        user.isVerified = true;
        await user.save();

        return done(null, user);
      }

      User.findOne({ googleId: profile.id })
        .then((existingUser) => {
          if (existingUser) {
            done(null, existingUser);
          } else {
            new User({
              googleId: profile.id,
              name: profile.displayName,
              email: profile.emails![0].value,
              avatar: profile.photos![0].value,
              phone_number: _json.phoneNumbers
                ? _json.phoneNumbers[0].value
                : "",
              dob: _json.birthdays ? new Date(_json.birthdays[0].date) : null,
              isVerified: true,
            })
              .save()
              .then((user) => done(null, user))
              .catch((err) => {
                console.error("Error during user creation:", err);
                done(err);
              });
          }
        })
        .catch((err: any) => {
          // Safety net for race condition
          if (err.code === 11000) {
            return done(
              null,
              false,
              new OAuthError(
                "EMAIL_ALREADY_EXISTS",
                "Account already exists with this email",
              ),
            );
          }
          console.error("Error during user lookup:", err);
          done(err);
        });
    },
  ),
);

export default passport;
