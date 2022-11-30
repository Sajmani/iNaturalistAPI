const _ = require( "lodash" );
const { expect } = require( "chai" );
const fs = require( "fs" );
const request = require( "supertest" );
const nock = require( "nock" );
const sinon = require( "sinon" );
const jwt = require( "jsonwebtoken" );
const { v4: uuidv4 } = require( "uuid" );
const config = require( "../../../config" );
const ObservationsController = require( "../../../lib/controllers/v1/observations_controller" );

const fixtures = JSON.parse( fs.readFileSync( "schema/fixtures.js" ) );
let obs;

describe( "Observations", ( ) => {
  const fixtureObs = fixtures.elasticsearch.observations.observation[0];
  describe( "show", ( ) => {
    it( "returns json", function ( done ) {
      request( this.app ).get( `/v2/observations/${fixtureObs.uuid}` ).expect( res => {
        expect( res.body.results[0].uuid ).to.eq( fixtureObs.uuid );
      } ).expect( "Content-Type", /json/ )
        .expect( 200, done );
    } );

    it( "returns 422 for malformed UUID, integer", function ( done ) {
      request( this.app ).get( "/v2/observations/12345" )
        .expect( 422, done );
    } );

    it( "returns 422 for malformed UUID, string", function ( done ) {
      request( this.app ).get( "/v2/observations/abcde" )
        .expect( 422, done );
    } );

    it( "returns 404 for unknown UUID", function ( done ) {
      request( this.app ).get( `/v2/observations/${uuidv4()}` )
        .expect( 404, done );
    } );

    it( "returns 404 for multiple unknown UUIDs", function ( done ) {
      request( this.app ).get( `/v2/observations/${uuidv4()},${uuidv4()}` )
        .expect( 404, done );
    } );

    it( "returns 200 for one known and one unknown UUID", function ( done ) {
      request( this.app ).get( `/v2/observations/${fixtureObs.uuid},${uuidv4()}` ).expect( res => {
        expect( res.body.results[0].uuid ).to.eq( fixtureObs.uuid );
      } ).expect( "Content-Type", /json/ )
        .expect( 200, done );
    } );

    it( "returns the uuid when specified in the fields query param", function ( done ) {
      request( this.app ).get( `/v2/observations/${fixtureObs.uuid}?fields=id,uuid` ).expect( res => {
        expect( res.body.results[0].uuid ).to.eq( fixtureObs.uuid );
      } ).expect( 200, done );
    } );

    it( "returns the uuid and quality_grade when all fields", function ( done ) {
      request( this.app ).get( `/v2/observations/${fixtureObs.uuid}?fields=all` ).expect( res => {
        expect( res.body.results[0].uuid ).to.eq( fixtureObs.uuid );
        expect( res.body.results[0].quality_grade ).to.eq( fixtureObs.quality_grade );
      } ).expect( 200, done );
    } );

    it( "returns the user name and login when requesting all user fields", function ( done ) {
      request( this.app )
        .post( `/v2/observations/${fixtureObs.uuid}` )
        .set( "Content-Type", "application/json" )
        .send( {
          fields: { user: "all" }
        } )
        .set( "X-HTTP-Method-Override", "GET" )
        .expect( res => {
          expect( res.body.results[0].user.login ).to.eq( fixtureObs.user.login );
          expect( res.body.results[0].user.name ).to.eq( fixtureObs.user.name );
        } )
        .expect( 200, done );
    } );
    it( "shows authenticated users their own private info", function ( done ) {
      obs = _.find( fixtures.elasticsearch.observations.observation, o => o.id === 1 );
      const token = jwt.sign( { user_id: 123 },
        config.jwtSecret || "secret",
        { algorithm: "HS512" } );
      request( this.app ).get( `/v2/observations/${obs.uuid}?fields=all` ).set( "Authorization", token )
        .expect( res => {
          expect( res.body.results[0].private_location ).to.not.be.undefined;
        } )
        .expect( "Content-Type", /json/ )
        .expect( 200, done );
    } );

    it( "shows authenticated project curators private info if they have access", function ( done ) {
      obs = _.find( fixtures.elasticsearch.observations.observation, o => o.id === 10 );
      const token = jwt.sign( { user_id: 123 },
        config.jwtSecret || "secret",
        { algorithm: "HS512" } );
      request( this.app ).get( `/v2/observations/${obs.uuid}?fields=all` ).set( "Authorization", token )
        .expect( res => {
          // util.pp( res.body );
          expect( res.body.results[0].private_location ).to.not.be.undefined;
        } )
        .expect( "Content-Type", /json/ )
        .expect( 200, done );
    } );

    it( "shows authenticated trusted users private info", function ( done ) {
      obs = _.find( fixtures.elasticsearch.observations.observation, o => o.id === 14 );
      const token = jwt.sign( { user_id: 125 },
        config.jwtSecret || "secret",
        { algorithm: "HS512" } );
      request( this.app ).get( `/v2/observations/${obs.uuid}?fields=all` ).set( "Authorization", token )
        .expect( res => {
          // util.pp( res.body );
          expect( res.body.results[0].private_location ).to.not.be.undefined;
        } )
        .expect( "Content-Type", /json/ )
        .expect( 200, done );
    } );

    it( "does not show authenticated project curators private info if they do not have access", function ( done ) {
      obs = _.find( fixtures.elasticsearch.observations.observation, o => o.id === 11 );
      const token = jwt.sign( { user_id: 123 },
        config.jwtSecret || "secret",
        { algorithm: "HS512" } );
      request( this.app ).get( `/v2/observations/${obs.uuid}?fields=all` ).set( "Authorization", token )
        .expect( res => {
          expect( res.body.results[0].private_location ).to.be.undefined;
        } )
        .expect( "Content-Type", /json/ )
        .expect( 200, done );
    } );

    it( "does not show authenticated users others' private info", function ( done ) {
      obs = _.find( fixtures.elasticsearch.observations.observation, o => o.id === 333 );
      const token = jwt.sign( { user_id: 123 },
        config.jwtSecret || "secret",
        { algorithm: "HS512" } );
      request( this.app ).get( `/v2/observations/${obs.uuid}?fields=all` ).set( "Authorization", token )
        .expect( res => {
          expect( res.body.results[0].private_location ).to.be.undefined;
        } )
        .expect( "Content-Type", /json/ )
        .expect( 200, done );
    } );
  } );

  describe( "search", ( ) => {
    it( "returns json", function ( done ) {
      request( this.app ).get( "/v2/observations" ).expect( res => {
        expect( res.body.results[0].uuid ).to.not.be.undefined;
      } )
        .expect( "Content-Type", /json/ )
        .expect( 200, done );
    } );

    it( "returns 422 for validation errors", function ( done ) {
      request( this.app ).get( "/v2/observations?rank=nonsense" )
        .expect( 422, done );
    } );

    it( "returns user when specified in the fields query param", function ( done ) {
      request( this.app ).get( "/v2/observations?fields=user" ).expect( res => {
        expect( res.body.results[0].user ).to.not.be.undefined;
      } ).expect( 200, done );
    } );

    it( "should error when you POST with X-HTTP-Method-Override set to GET and a multipart/form-data payload", function ( done ) {
      request( this.app )
        .post( "/v2/observations" )
        .send( `user_id=${fixtureObs.user.id}&fields=user` )
        .set( "Content-Type", "multipart/form-data" )
        .set( "X-HTTP-Method-Override", "GET" )
        .expect( res => {
          expect( res.body.status ).to.eq( "422" );
        } )
        .expect( 422, done );
    } );

    it( "should search when you POST with X-HTTP-Method-Override set to GET and a JSON payload", function ( done ) {
      request( this.app )
        .post( "/v2/observations" )
        .set( "Content-Type", "application/json" )
        .send( {
          user_id: fixtureObs.user.id,
          fields: ["user"]
        } )
        .set( "X-HTTP-Method-Override", "GET" )
        .expect( res => {
          expect( res.body.results[0].user.id ).to.eq( fixtureObs.user.id );
        } )
        .expect( "Content-Type", /json/ )
        .expect( 200, done );
    } );

    it( "shows authenticated users their own private info", function ( done ) {
      const userId = 123;
      const token = jwt.sign( { user_id: userId },
        config.jwtSecret || "secret",
        { algorithm: "HS512" } );
      request( this.app ).get( `/v2/observations?user_id=${userId}&fields=all` ).set( "Authorization", token )
        .expect( res => {
          const obscuredObs = _.find( res.body.results, o => o.obscured );
          expect( obscuredObs.private_location ).to.not.be.undefined;
        } )
        .expect( "Content-Type", /json/ )
        .expect( 200, done );
    } );

    it( "does not show authenticated users others' private info", function ( done ) {
      const token = jwt.sign( { user_id: 5 },
        config.jwtSecret || "secret",
        { algorithm: "HS512" } );
      request( this.app ).get( "/v2/observations?user_id=123&fields=all" ).set( "Authorization", token )
        .expect( res => {
          const obscuredObs = _.find( res.body.results, o => o.obscured );
          expect( obscuredObs.private_location ).to.be.undefined;
        } )
        .expect( "Content-Type", /json/ )
        .expect( 200, done );
    } );

    it( "accepts place UUID", function ( done ) {
      const usUUID = fixtures.elasticsearch.places.place[0].uuid;
      request( this.app ).get( `/v2/observations?place_id=${usUUID}` ).expect( res => {
        expect( res.body.results[0].uuid ).to.not.be.undefined;
      } )
        .expect( "Content-Type", /json/ )
        .expect( 200, done );
    } );

    it( "accepts multiple place UUIDs", function ( done ) {
      const uuids = fixtures.elasticsearch.places.place.slice( 0, 2 ).map( p => p.uuid );
      request( this.app ).get( `/v2/observations?place_id=${uuids.join( "," )}` ).expect( res => {
        expect( res.body.results[0].uuid ).to.not.be.undefined;
      } )
        .expect( "Content-Type", /json/ )
        .expect( 200, done );
    } );

    it( "accepts place UUID with X-HTTP-Method-Override", function ( done ) {
      const usUUID = fixtures.elasticsearch.places.place[0].uuid;
      request( this.app )
        .post( "/v2/observations" )
        .set( "Content-Type", "application/json" )
        .send( { place_id: usUUID } )
        .set( "X-HTTP-Method-Override", "GET" )
        .expect( res => {
          expect( res.body.results[0].uuid ).to.not.be.undefined;
        } )
        .expect( "Content-Type", /json/ )
        .expect( 200, done );
    } );

    it( "accepts multiple place UUIDs with X-HTTP-Method-Override", function ( done ) {
      const uuids = fixtures.elasticsearch.places.place.slice( 0, 2 ).map( p => p.uuid );
      request( this.app )
        .post( "/v2/observations" )
        .set( "Content-Type", "application/json" )
        .send( { place_id: uuids } )
        .set( "X-HTTP-Method-Override", "GET" )
        .expect( res => {
          expect( res.body.results[0].uuid ).to.not.be.undefined;
        } )
        .expect( "Content-Type", /json/ )
        .expect( 200, done );
    } );
  } );

  describe( "create", ( ) => {
    it( "returns private coordinates when geoprivacy is private", function ( done ) {
      const o = fixtures.elasticsearch.observations.observation[5];
      expect( o.geoprivacy ).to.eq( "private" );
      expect( o.location ).to.be.undefined;
      const token = jwt.sign( { user_id: 333 },
        config.jwtSecret || "secret",
        { algorithm: "HS512" } );
      nock( "http://localhost:3000" )
        .post( "/observations" )
        .reply( 200, [{ id: o.id, uuid: o.uuid }] );
      request( this.app ).post( "/v2/observations" )
        .set( "Authorization", token )
        .set( "Content-Type", "application/json" )
        // it doesn't really matter what we post since we're just stubbing the
        // Rails app to return obs 6 to load from the ES index
        // We're testing with these fields so let's make sure to get them in the response
        .send( {
          observation: { },
          fields: {
            private_geojson: {
              coordinates: true
            },
            private_location: true
          }
        } )
        .expect( 200 )
        .expect( res => {
          const resObs = res.body.results[0];
          expect( resObs.private_geojson.coordinates[1] ).to
            .eq( o.private_geojson.coordinates[1] );
          expect( resObs.private_location ).not.to.be.undefined;
          expect( resObs.private_location ).to.eq( o.private_location );
        } )
        .expect( "Content-Type", /json/ )
        .expect( 200, done );
    } );
  } );

  describe( "update", ( ) => {
    const token = jwt.sign( { user_id: fixtureObs.user.id },
      config.jwtSecret || "secret",
      { algorithm: "HS512" } );
    it( "returns json", function ( done ) {
      const newDesc = "lskdgnlskdng";
      // Using nock to stub the rails response is not enough here b/c the v1
      // controller will load fresh data from the ES index, so if we want to see
      // a change without actually changing data, we need to stub the v1
      // controller reponse
      sinon.stub( ObservationsController, "update" )
        .callsFake(
          ( ) => ( { ...fixtureObs, description: newDesc } )
        );
      request( this.app ).put( `/v2/observations/${fixtureObs.uuid}` )
        .set( "observation", JSON.stringify( { } ) )
        .field( "fields", JSON.stringify( { description: true } ) )
        .set( "Authorization", token )
        .expect( 200 )
        .expect( res => {
          expect( res.body.results[0].uuid ).to.eq( fixtureObs.uuid );
          expect( res.body.results[0].description ).to.eq( newDesc );
        } )
        .expect( "Content-Type", /json/ )
        .expect( 200, done );
    } );
  } );

  describe( "taxon_summary", ( ) => {
    it( "should include a relevant listed taxon", function ( done ) {
      const o = fixtures.elasticsearch.observations.observation[0];
      const railsResponse = {
        conservation_status: {},
        listed_taxon: {
          id: 1,
          establishment_means_label: "introduced"
        },
        wikipedia_summary: "bar"
      };
      nock( "http://localhost:3000" )
        .get( `/observations/${o.id}/taxon_summary` )
        .reply( 200, railsResponse );
      request( this.app ).get( `/v2/observations/${o.uuid}/taxon_summary` )
        .set( "Content-Type", "application/json" )
        .expect( 200 )
        .expect( res => {
          expect( res.body.listed_taxon.establishment_means_label )
            .to.eq( railsResponse.listed_taxon.establishment_means_label );
        } )
        .expect( 200, done );
    } );
  } );

  describe( "fave", ( ) => {
    const token = jwt.sign( { user_id: 123 },
      config.jwtSecret || "secret",
      { algorithm: "HS512" } );
    it( "returns an empty success on POST", function ( done ) {
      nock( "http://localhost:3000" )
        .post( `/votes/vote/observation/${fixtureObs.id}` )
        .reply( 200 );
      request( this.app ).post( `/v2/observations/${fixtureObs.uuid}/fave` )
        .set( "Authorization", token )
        .expect( 204, done );
    } );
    it( "returns an empty success on DELETE", function ( done ) {
      nock( "http://localhost:3000" )
        .delete( `/votes/unvote/observation/${fixtureObs.id}` )
        .reply( 204 );
      request( this.app ).delete( `/v2/observations/${fixtureObs.uuid}/fave` )
        .set( "Authorization", token )
        .expect( 204, done );
    } );
  } );

  describe( "quality metric voting", ( ) => {
    const token = jwt.sign( { user_id: 123 },
      config.jwtSecret || "secret",
      { algorithm: "HS512" } );
    describe( "POST", ( ) => {
      it( "should fail on a bad metric", function ( done ) {
        request( this.app ).delete( `/v2/observations/${fixtureObs.uuid}/quality/wyld` )
          .set( "Authorization", token )
          .expect( 422, done );
      } );
      it( "should accept the agree query param", function ( done ) {
        nock( "http://localhost:3000" )
          .post( `/observations/${fixtureObs.id}/quality/wild` )
          .reply( 204 );
        request( this.app ).post( `/v2/observations/${fixtureObs.uuid}/quality/wild` )
          .set( "Authorization", token )
          .set( "Content-Type", "application/json" )
          .send( {
            agree: false
          } )
          .expect( 204, done );
      } );
      it( "should treat needs_id the same even though it's not a QualityMetric", function ( done ) {
        nock( "http://localhost:3000" )
          .post( `/votes/vote/observation/${fixtureObs.id}` )
          .reply( 204 );
        request( this.app ).post( `/v2/observations/${fixtureObs.uuid}/quality/needs_id` )
          .set( "Authorization", token )
          .set( "Content-Type", "application/json" )
          .send( {
            agree: false
          } )
          .expect( 204, done );
      } );
    } );
    describe( "DELETE", ( ) => {
      it( "should return an empty success", function ( done ) {
        nock( "http://localhost:3000" )
          .delete( `/observations/${fixtureObs.id}/quality/wild` )
          .reply( 204 );
        request( this.app ).delete( `/v2/observations/${fixtureObs.uuid}/quality/wild` )
          .set( "Authorization", token )
          .expect( 204, done );
      } );
    } );
  } );

  describe( "viewed_updates", ( ) => {
    const token = jwt.sign( { user_id: 123 },
      config.jwtSecret || "secret",
      { algorithm: "HS512" } );
    it( "returns an empty success on PUT", function ( done ) {
      nock( "http://localhost:3000" )
        .put( `/observations/${fixtureObs.uuid}/viewed_updates` )
        .reply( 200 );
      request( this.app ).put( `/v2/observations/${fixtureObs.uuid}/viewed_updates` )
        .set( "Authorization", token )
        .expect( 204, done );
    } );
  } );

  describe( "speciesCounts", ( ) => {
    it( "returns json", function ( done ) {
      request( this.app ).get( "/v2/observations/species_counts" ).expect( res => {
        expect( res.body.results[0].taxon ).to.not.be.undefined;
      } )
        .expect( "Content-Type", /json/ )
        .expect( 200, done );
    } );
  } );

  describe( "observers", ( ) => {
    it( "returns json", function ( done ) {
      request( this.app ).get( "/v2/observations/observers?user_id=1" ).expect( res => {
        expect( res.body.results[0].user ).to.not.be.undefined;
      } )
        .expect( "Content-Type", /json/ )
        .expect( 200, done );
    } );
  } );

  describe( "popularFieldValues", ( ) => {
    it( "returns json", function ( done ) {
      request( this.app ).get( "/v2/observations/popular_field_values" ).expect( res => {
        expect( res.body.results[0] ).to.not.be.undefined;
      } )
        .expect( "Content-Type", /json/ )
        .expect( 200, done );
    } );
  } );

  describe( "histogram", ( ) => {
    it( "returns json", function ( done ) {
      request( this.app ).get( "/v2/observations/histogram" ).expect( res => {
        expect( res.body.results ).to.not.be.undefined;
      } )
        .expect( "Content-Type", /json/ )
        .expect( 200, done );
    } );
  } );
} );
