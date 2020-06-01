const passport = require("passport");
const GithubStrategy = require("passport-github").Strategy;
import axios from "axios";
import { print } from "graphql";
import gql from "graphql-tag";
const jwt = require("jsonwebtoken");
const jwtSecret = "i30LbO4dZlwjW95R8cP+D8hZ2OktZSMN";

var knex = require("knex")({
  client: "pg",
  version: "7.2",
  connection: {
    host: "ec2-3-222-30-53.compute-1.amazonaws.com",
    user: "rfybahurniwfef",
    password:
      "07c7959de21aacdfc3661ba862791029d8a03f33b9c0493a4dbd372321ad99ca",
    database: "d2284dcfcft091",
    dialectOptions: {
      ssl: { require: true },
    },
    port: 5432,
    ssl: { rejectUnauthorized: false },
  },
});

// serialize the user.id to save in the cookie session
// so the browser will remember the user when login
passport.serializeUser((user, done) => {
  const store = {
    id: user.id,
    token: user.token,
  };
  done(null, store);
});

// deserialize the cookieUserId to user in the database
passport.deserializeUser(async (user, done) => {
  // console.log("deserializing");
  // console.log(user);
  console.log(jwt.verify(user.token, jwtSecret));
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
      knex("users")
        .where({ github_user_id: profile.id })
        .then((user) => {
          // !currentUser, pass it on
          if (user[0] !== undefined) {
            console.log(user[0].id);
            const claims = {
              sub: "" + user[0].id,
              "https://hasura.io/jwt/claims": {
                "x-hasura-default-role": "admin",
                "x-hasura-user-id": "" + user[0].id,
                "x-hasura-allowed-roles": ["admin", "user"],
              },
            };

            const token = jwt.sign(claims, jwtSecret);

            user[0].token = token;
            done(null, user[0]);
          } else {
            // !currentUser, create user in our db
            knex("users")
              .insert({
                github_user_id: profile._json.id,
                name: profile._json.name,
                bio: profile._json.bio,
                public_repos: profile._json.public_repos,
                public_gists: profile._json.public_gists,
                access_token: accessToken,
                refresh_token: refreshToken,
              })
              .returning([
                "id",
                "github_user_id",
                "name",
                "bio",
                "public_repos",
                "public_gists",
                "access_token",
                "refresh_token",
              ])
              .then((user) => {
                console.log(user[0].id);
                const claims = {
                  sub: "" + user[0].id,
                  "https://hasura.io/jwt/claims": {
                    "x-hasura-default-role": "admin",
                    "x-hasura-user-id": "" + user[0].id,
                    "x-hasura-allowed-roles": ["admin", "user"],
                  },
                };

                const token = jwt.sign(claims, jwtSecret);

                user[0].token = token;
                user[0].token = token;
                done(null, user[0]);
              });
          }
        });

      /*
       use the profile info (mainly profile id) to check if the user is registerd in ur db
       If yes select the user and pass him to the done callback
       If not create the user and then select him and pass to callback
      */
    }
  )
);
