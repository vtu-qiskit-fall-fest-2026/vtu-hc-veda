/*
 * api.js — tiny fetch wrapper for the GREEN QUANTA backend.
 *
 * Adds the JWT (from the current session) as a Bearer header, serialises JSON,
 * throws on non-2xx responses with the server's `detail` message, and returns
 * the parsed JSON body. Used by state.js (Auth + Progress + Settings + Circuits)
 * when the app is running in live-database mode.
 */
(function (global) {
  'use strict';

  function currentToken() {
    try {
      var s = global.Auth && global.Auth.session();
      return s ? s.access_token || '' : '';
    } catch (e) { return ''; }
  }

  function request(method, path, body) {
    var opts = {
      method: method,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' }
    };
    var token = currentToken();
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    if (body !== undefined) opts.body = JSON.stringify(body);

    return fetch('/api' + path, opts).then(function (res) {
      return res.text().then(function (text) {
        var data = null;
        try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
        if (!res.ok) {
          var err = new Error((data && data.detail) || ('Request failed (' + res.status + ')'));
          err.status = res.status;
          err.detail = data;
          throw err;
        }
        return data;
      });
    });
  }

  global.Api = {
    get: function (path) { return request('GET', path); },
    post: function (path, body) { return request('POST', path, body); },
    put: function (path, body) { return request('PUT', path, body); },
    del: function (path) { return request('DELETE', path); }
  };
})(window);
