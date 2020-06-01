const passport = require("passport");
const GithubStrategy = require("passport-github").Strategy;
import axios from "axios";
import { print } from "graphql";
import gql from "graphql-tag";

// serialize the user.id to save in the cookie session
// so the browser will remember the user when login
passport.serializeUser((user, done) => {
  console.log(user);
  done(null, user);
});

// deserialize the cookieUserId to user in the database
passport.deserializeUser(async (user, done) => {
  done(null, user);
});

passport.use(
  new GithubStrategy(
    {
      clientID: "Iv1.ee5bc6912a163e42",
      clientSecret: "55d30b87cbc276aa561c0f8443ed9994b240565a",
      callbackURL: "/auth/github/redirect",
    },
    async function(accessToken, refreshToken, profile, done) {
      console.log(profile);
      const query = `query findUser{
        findUser(githubUserid:"${profile.id}"){
          id
          githubUserId
          name
        }
      }`;

      let { data } = await axios.post("http://localhost:4000", { query });
      console.log("finding user");
      console.log(data.data);
      if (data.data.findUser === null) {
        console.log("user not found creating user");
        const mutation = gql`
          mutation newUser(
            $githubUserId: Int!
            $name: String!
            $bio: String
            $pubic_repos: Int!
            $public_gists: Int!
            $authToken: String
            $refreshToken: String
          ) {
            newUser(
              githubUserId: $githubUserId
              name: $name
              bio: $bio
              public_repos: $pubic_repos
              public_gists: $public_gists
              authToken: $authToken
              refreshToken: $refreshToken
            ) {
              name
              githubUserId
              bio
              public_repos
              public_gists
              authToken
              refreshToken
            }
          }
        `;

        let newUser = await axios
          .post("http://localhost:4000", {
            query: print(mutation),
            variables: {
              githubUserId: profile._json.id,
              name: profile._json.name,
              bio: profile._json.bio,
              pubic_repos: profile._json.public_repos,
              public_gists: profile._json.public_gists,
              authToken: accessToken,
              refreshToken: refreshToken,
            },
          })
          .catch((error) => console.log(error));

        console.log(newUser.data);

        if (newUser) {
          done(null, data.newUser);
        }
      }

      /*
       use the profile info (mainly profile id) to check if the user is registerd in ur db
       If yes select the user and pass him to the done callback
       If not create the user and then select him and pass to callback
      */
      console.log("found existing user");
      console.log(data.data.findUser);
      return done(null, data.data.findUser);
    }
  )
);
