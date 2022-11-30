const { expect } = require( "chai" );
const _ = require( "lodash" );
const request = require( "supertest" );
const nock = require( "nock" );
const jwt = require( "jsonwebtoken" );
const fs = require( "fs" );
const config = require( "../../../config" );

const fixtures = JSON.parse( fs.readFileSync( "schema/fixtures.js" ) );

describe( "Annotations", ( ) => {
  const a = {
    id: 123,
    uuid: "dcd68b65-e5ae-4581-8cea-5788cbefe53d"
  };
  const token = jwt.sign( { user_id: 333 },
    config.jwtSecret || "secret",
    { algorithm: "HS512" } );
  describe( "create", ( ) => {
    it( "returns JSON", function ( done ) {
      nock( "http://localhost:3000" )
        .post( "/annotations" )
        .reply( 200, { id: a.id, uuid: a.uuid } );
      request( this.app ).post( "/v2/annotations" )
        .set( "Authorization", token )
        .set( "Content-Type", "application/json" )
        // Actual values of what we send don't matter since we're mocking the
        // Rails response, but we need it to pass request schema validation
        .send( {
          resource_type: "Observation",
          resource_id: a.uuid,
          controlled_attribute_id: 1,
          controlled_value_id: 2
        } )
        .expect( 200 )
        .expect( res => {
          const anno = res.body.results[0];
          expect( anno.uuid ).to.eq( a.uuid );
        } )
        .expect( "Content-Type", /json/ )
        .expect( 200, done );
    } );
  } );
  describe( "delete", ( ) => {
    it( "should not return anything if successful", function ( done ) {
      nock( "http://localhost:3000" )
        .delete( `/annotations/${a.uuid}?uuid=${a.uuid}` )
        .reply( 200 );
      request( this.app ).delete( `/v2/annotations/${a.uuid}` )
        .set( "Authorization", token )
        .set( "Content-Type", "application/json" )
        .expect( 200 )
        .expect( res => {
          expect( res.body ).to.eq( "" );
        } )
        .expect( 200, done );
    } );
  } );
  describe( "voting", ( ) => {
    const obs = _.find(
      fixtures.elasticsearch.observations.observation,
      o => o.annotations && o.annotations.length > 0
    );
    const anno = obs.annotations[0];

    describe( "POST vote", ( ) => {
      it( "returns 204 for success", function ( done ) {
        // Note that it doesn't really matter what Rails returns. The API just
        // cares about the HTTP status
        nock( "http://localhost:3000" )
          .post( `/votes/vote/annotation/${anno.uuid}` )
          .reply( 204, {} );
        request( this.app ).post( `/v2/annotations/${anno.uuid}/vote` )
          .set( "Authorization", token )
          .expect( 204, done );
      } );

      it( "accepts the vote param", function ( done ) {
        nock( "http://localhost:3000" )
          .post( `/votes/vote/annotation/${anno.uuid}` )
          .reply( 204, {} );
        request( this.app )
          .post( `/v2/annotations/${anno.uuid}/vote` )
          .set( "Authorization", token )
          .set( "Content-Type", "application/json" )
          .send( { vote: "bad" } )
          .expect( 204, done );
      } );
    } );
    describe( "DELETE vote", ( ) => {
      it( "returns 204 for success", function ( done ) {
        nock( "http://localhost:3000" )
          .delete( `/votes/unvote/annotation/${anno.uuid}?uuid=${anno.uuid}` )
          .reply( 204, {} );
        request( this.app ).delete( `/v2/annotations/${anno.uuid}/vote` )
          .set( "Authorization", token )
          .expect( 204, done );
      } );
    } );
  } );
} );
