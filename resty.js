// Generated by CoffeeScript 1.9.2
(function() {
  var Handlers, SQLAdapter, addUrlParams, checkError, dbExecute, entityIsCollection, getSql, getValues, guid, info, local, localCreate, localDelete, localErrorDebug, localFirst, localOnly, localRead, localSuccessDebug, localSync, localSyncDebug, localUpdate, parseSelectResult, remote, remoteErrorDebug, remoteFirst, remoteOnly, remoteSuccessDebug, remoteSync, remoteSyncDebug, request, requestDebug, requestId, setRandomId, sqlColumnList, sqlCountQuery, sqlCreateModelList, sqlDeleteAll, sqlDeleteAllQuery, sqlDeleteModel, sqlDeleteModelQuery, sqlDeleteNotInQuery, sqlInsertQuery, sqlQList, sqlReplaceQuery, sqlSelectAllQuery, sqlSelectModelQuery, sqlSetList, sqlUpdateModel, sqlUpdateModelList, sqlUpdateQuery, sync, syncDebug, warn,
    slice = [].slice;

  SQLAdapter = require('alloy/sync/sql');

  Handlers = _.once(function() {
    return {
      RemoteOnly: remoteOnly,
      LocalOnly: localOnly,
      Remote: remote,
      Local: local,
      RemoteFirst: remoteFirst,
      LocalFirst: localFirst
    };
  });

  sync = function(method, entity, options) {
    var adapter, handler, mode;
    if (options == null) {
      options = {};
    }
    adapter = _.clone(entity.config.adapter);
    delete adapter.type;
    _.defaults(options, adapter);
    _.defaults(options, {
      "delete": true,
      merge: true,
      reset: false,
      mode: 'RemoteFirst',
      columns: Object.keys(entity.config.columns)
    });
    options.syncNo = requestId();
    mode = _.result(options, 'mode');
    handler = Handlers()[mode];
    syncDebug(method, mode, entity, options);
    handler(method, entity, options);
    return entity;
  };

  remoteOnly = function(method, entity, options) {
    return remoteSync(method, entity, options);
  };

  localOnly = function(method, entity, options) {
    return localSync(method, entity, options);
  };

  remote = function(method, entity, options) {
    var success;
    success = options.success;
    options.success = function(resp, status, xhr) {
      if (typeof success === "function") {
        success(resp, status, xhr);
      }
      if (method === 'read') {
        method = 'update';
      }
      options.success = null;
      options.error = null;
      return localSync(method, entity, options);
    };
    return remoteSync(method, entity, options);
  };

  local = function(method, entity, options) {
    var success;
    success = options.success;
    options.success = function(resp, status, xhr) {
      if (typeof success === "function") {
        success(resp, status, xhr);
      }
      options.success = null;
      options.error = null;
      return remoteSync(method, entity, options);
    };
    return localSync(method, entity, options);
  };

  remoteFirst = function(method, entity, options) {
    var error;
    error = options.error;
    options.error = function() {
      options.error = error;
      return localOnly(method, entity, options);
    };
    return remote(method, entity, options);
  };

  localFirst = function(method, entity, options) {
    var error, makeRemote, success;
    error = options.error;
    success = options.success;
    makeRemote = function() {
      options.success = success;
      options.error = error;
      return remote(method, entity, options);
    };
    options.error = makeRemote;
    options.success = function(resp, status, options) {
      if (method === 'read' && resp.length === 0) {
        return makeRemote();
      }
      return typeof success === "function" ? success(resp, status, options) : void 0;
    };
    return localOnly(method, entity, options);
  };

  remoteSync = function(method, entity, options) {
    var emulateHTTP, emulateJSON, error, isCollection, rootObject, success, urlRoot;
    isCollection = entityIsCollection(entity);
    urlRoot = _.result(options, 'urlRoot');
    emulateHTTP = _.result(options, 'emulateHTTP');
    emulateJSON = _.result(options, 'emulateJSON');
    rootObject = options.rootObject;
    success = options.success;
    error = options.error;
    if (urlRoot) {
      if (isCollection) {
        entity.url = urlRoot;
      } else {
        entity.urlRoot = urlRoot;
      }
    }
    if (emulateHTTP != null) {
      Alloy.Backbone.emulateHTTP = emulateHTTP;
    }
    if (emulateJSON != null) {
      Alloy.Backbone.emulateJSON = emulateJSON;
    }
    options.parse = true;
    options.attrs = _.result(options, 'attrs');
    options.success = function(resp) {
      var err;
      if (rootObject) {
        resp = rootObject(resp, options);
      }
      if (err = checkError(resp)) {
        return typeof error === "function" ? error(err) : void 0;
      }
      remoteSuccessDebug(method, options, resp);
      return typeof success === "function" ? success(resp) : void 0;
    };
    options.error = function(err) {
      remoteErrorDebug(method, options, err);
      return typeof error === "function" ? error(err) : void 0;
    };
    remoteSyncDebug(method, options);
    return Alloy.Backbone.sync(method, entity, options);
  };

  request = function(options) {
    var beforeSend, contentType, data, dataType, error, header, headers, success, type, url, urlparams, value, xhr;
    type = _.result(options, 'type');
    url = _.result(options, 'url');
    urlparams = _.result(options, 'urlparams') || {};
    headers = _.result(options, 'headers') || {};
    data = _.result(options, 'data');
    dataType = _.result(options, 'dataType');
    contentType = _.result(options, 'contentType');
    error = options.error;
    success = options.success;
    beforeSend = options.beforeSend;
    url = addUrlParams(url, urlparams);
    xhr = Ti.Network.createHTTPClient(options);
    xhr.open(type, url);
    headers['Content-Type'] = contentType;
    for (header in headers) {
      value = _.result(headers, header);
      if (value) {
        xhr.setRequestHeader(header, value);
      }
    }
    if (typeof beforeSend === "function") {
      beforeSend(xhr);
    }
    xhr.onerror = function(res) {
      return typeof error === "function" ? error(res.error) : void 0;
    };
    xhr.onload = function() {
      var err;
      data = (function() {
        switch (dataType) {
          case 'xml':
            return this.responseXML;
          case 'text':
            return this.responseText;
          case 'json':
            try {
              return JSON.parse(this.responseText);
            } catch (_error) {
              err = _error;
              return null;
            }
            break;
          default:
            return this.responseData;
        }
      }).call(this);
      if (data) {
        return typeof success === "function" ? success(data) : void 0;
      } else {
        return typeof error === "function" ? error(err != null ? err : "Empty response") : void 0;
      }
    };
    requestDebug(options, type, url);
    xhr.send(data);
    return xhr;
  };

  localSync = function(method, entity, options) {
    var dbName, isCollection, query, resp, sql, table;
    table = options.collection_name;
    dbName = options.db_name || ALLOY_DB_DEFAULT;
    query = _.result(options, 'query');
    isCollection = entityIsCollection(entity);
    sql = getSql(query);
    options.parse = false;
    localSyncDebug(method, options, sql, table);
    resp = (function() {
      switch (method) {
        case 'read':
          return localRead(entity, isCollection, dbName, table, sql, options);
        case 'create':
          return localCreate(entity, isCollection, dbName, table, sql, options);
        case 'update':
          return localUpdate(entity, isCollection, dbName, table, sql, options);
        case 'delete':
          return localDelete(entity, isCollection, dbName, table, sql, options);
      }
    })();
    if (resp) {
      localSuccessDebug(method, options, table, resp);
      return typeof options.success === "function" ? options.success(resp) : void 0;
    } else {
      localErrorDebug(method, options, table);
      return typeof options.error === "function" ? options.error("Empty response") : void 0;
    }
  };

  localRead = function(entity, isCollection, dbName, table, sql, options) {
    sql || (sql = isCollection ? [sqlSelectAllQuery(table)] : [sqlSelectModelQuery(table, entity.idAttribute), entity.id]);
    return dbExecute(dbName, false, sql, function(db, rs) {
      var resp;
      resp = parseSelectResult(rs);
      if (!isCollection) {
        resp = resp[0];
      }
      return resp;
    });
  };

  localCreate = function(entity, isCollection, dbName, table, sql, options) {
    var columns, models;
    columns = options.columns;
    models = isCollection ? entity.models : [entity];
    dbExecute(dbName, true, sql, function(db, rs) {
      if (sql) {
        return;
      }
      if (isCollection) {
        sqlDeleteAll(db, table);
      }
      return sqlCreateModelList(db, table, models, columns);
    });
    if (isCollection) {
      return entity;
    } else {
      return entity.toJSON();
    }
  };

  localUpdate = function(entity, isCollection, dbName, table, sql, options) {
    var columns, models;
    columns = options.columns;
    models = isCollection ? entity.models : [entity];
    dbExecute(dbName, true, sql, function(db, rs) {
      if (sql) {
        return;
      }
      if (isCollection && options.reset) {
        sqlDeleteAll(db, table);
        return sqlCreateModelList(db, table, models, columns);
      } else {
        return sqlUpdateModelList(db, table, models, columns, isCollection, options);
      }
    });
    if (isCollection) {
      return entity.toJSON();
    } else {
      return entity;
    }
  };

  localDelete = function(entity, isCollection, dbName, table, sql, options) {
    dbExecute(dbName, false, sql, function(db, rs) {
      if (sql) {
        return;
      }
      if (isCollection) {
        return sqlDeleteAll(db, table);
      } else {
        return sqlDeleteModel(db, table, entity);
      }
    });
    if (isCollection) {
      return entity.toJSON();
    } else {
      return entity;
    }
  };

  sqlCreateModelList = function(db, table, models, columns) {
    var query;
    query = sqlInsertQuery(table, columns);
    return models.map(function(model) {
      var values;
      if (!model.id) {
        setRandomId(model);
      }
      values = getValues(model, columns);
      return db.execute(query, values);
    });
  };

  sqlUpdateModel = function(db, table, model, columns, merge, insertQuery, replaceQuery) {
    var modelFields, updateQuery, updatedFields, updatedValues, values;
    values = getValues(model, columns);
    if (!model.id) {
      setRandomId(model);
      return db.execute(insertQuery, values);
    }
    modelFields = Object.keys(model.attributes);
    updatedFields = columns.filter(function(column) {
      return modelFields.indexOf(column) >= 0;
    });
    if (updatedFields.length === columns.length || !merge) {
      return db.execute(replaceQuery, values);
    }
    db.execute(insertQuery, values);
    if (db.rowsAffected !== 0) {
      return;
    }
    updateQuery = sqlUpdateQuery(table, updatedFields, model.idAttribute);
    updatedValues = getValues(model, updatedFields);
    updatedValues.push(model.id);
    return db.execute(updateQuery, updatedValues);
  };

  sqlUpdateModelList = function(db, table, models, columns, isCollection, options) {
    var count, countQuery, deleteQuery, idAttribute, ids, insertQuery, merge, replaceQuery, rs;
    if (models.length === 0) {
      return;
    }
    if (models.length > 1) {
      countQuery = sqlCountQuery(table);
      rs = db.execute(countQuery);
      count = rs.fieldByName('count');
      if (count === 0) {
        return sqlCreateModelList(db, table, models, columns);
      }
    }
    insertQuery = sqlInsertQuery(table, columns);
    replaceQuery = sqlReplaceQuery(table, columns);
    merge = options.merge;
    ids = models.map(function(model) {
      sqlUpdateModel(db, table, model, columns, merge, insertQuery, replaceQuery);
      return model.id;
    });
    if (isCollection && options["delete"]) {
      idAttribute = models[0].idAttribute;
      deleteQuery = sqlDeleteNotInQuery(table, idAttribute, ids.length);
      return db.execute(deleteQuery, ids);
    }
  };

  sqlDeleteAll = function(db, table) {
    var query;
    query = sqlDeleteAllQuery(table);
    return db.execute(query);
  };

  sqlDeleteModel = function(db, table, model) {
    var query;
    query = sqlDeleteModelQuery(table, model.idAttribute);
    return db.execute(query, model.id);
  };

  sqlDeleteAllQuery = function(table) {
    return "DELETE FROM " + table + ";";
  };

  sqlDeleteModelQuery = function(table, idAttribute) {
    return "DELETE FROM " + table + " WHERE " + idAttribute + "=?;";
  };

  sqlDeleteNotInQuery = function(table, idAttribute, count) {
    var sqlQ;
    sqlQ = sqlQList(count);
    return "DELETE FROM " + table + " WHERE " + idAttribute + " NOT IN " + sqlQ;
  };

  sqlInsertQuery = function(table, columns) {
    var sqlColumns, sqlQ;
    sqlColumns = sqlColumnList(columns);
    sqlQ = sqlQList(columns.length);
    return "INSERT OR IGNORE INTO " + table + " " + sqlColumns + " VALUES " + sqlQ + ";";
  };

  sqlReplaceQuery = function(table, columns) {
    var sqlColumns, sqlQ;
    sqlColumns = sqlColumnList(columns);
    sqlQ = sqlQList(columns.length);
    return "REPLACE INTO " + table + " " + sqlColumns + " VALUES " + sqlQ + ";";
  };

  sqlUpdateQuery = function(table, columns, idAttribute) {
    var sqlSet;
    sqlSet = sqlSetList(columns);
    return "UPDATE " + table + " SET " + sqlSet + " WHERE " + idAttribute + "=?;";
  };

  sqlSelectAllQuery = function(table) {
    return "SELECT * FROM " + table + ";";
  };

  sqlSelectModelQuery = function(table, idAttribute) {
    return "SELECT * FROM " + table + " WHERE " + idAttribute + "=?;";
  };

  sqlCountQuery = function(table) {
    return "SELECT COUNT(*) AS count FROM " + table;
  };

  sqlQList = function(count) {
    return "(" + (Array(count + 1).join('?,').slice(0, -1)) + ")";
  };

  sqlColumnList = function(columns) {
    return "(" + (columns.join()) + ")";
  };

  sqlSetList = function(columns) {
    return columns.map(function(column) {
      return column + "=?";
    }).join();
  };

  dbExecute = function(dbName, transaction, sql, action) {
    var db, result, rs;
    action || (action = function(db, rs) {
      return rs;
    });
    db = Ti.Database.open(dbName);
    if (transaction) {
      db.execute("BEGIN;");
    }
    if (sql) {
      rs = db.execute.apply(db, sql);
    }
    result = action(db, rs);
    if (rs != null) {
      rs.close();
    }
    if (transaction) {
      db.execute("COMMIT;");
    }
    db.close();
    return result;
  };

  parseSelectResult = function(rs) {
    var attrs, fields, i, j, ref, results;
    fields = (function() {
      var j, ref, results;
      results = [];
      for (i = j = 0, ref = rs.fieldCount; j < ref; i = j += 1) {
        results.push(rs.fieldName(i));
      }
      return results;
    })();
    results = [];
    while (rs.isValidRow()) {
      attrs = {};
      for (i = j = 0, ref = rs.fieldCount; j < ref; i = j += 1) {
        attrs[fields[i]] = rs.field(i);
      }
      rs.next();
      results.push(attrs);
    }
    return results;
  };

  guid = function() {
    return Math.random().toString(36) + Math.random().toString(36);
  };

  setRandomId = function(model) {
    return model.set(model.idAttribute, guid());
  };

  addUrlParams = function(url, urlparams) {
    var delimiter, encode, p, v;
    encode = encodeURIComponent;
    urlparams = ((function() {
      var results;
      results = [];
      for (p in urlparams) {
        v = urlparams[p];
        results.push((encode(p)) + "=" + (encode(v)));
      }
      return results;
    })()).join('&');
    if (!urlparams) {
      return url;
    }
    delimiter = url.indexOf('?') === -1 ? '?' : '&';
    return url + delimiter + urlparams;
  };

  getSql = function(query) {
    var params, statement;
    if (!query) {
      return null;
    }
    if (_.isObject(query)) {
      statement = _.result(query, 'statement') || _.result(query, 'text');
      params = _.result(query, 'params') || _.result(query, 'values') || [];
      return [statement, params];
    } else {
      return [query];
    }
  };

  entityIsCollection = function(entity) {
    return entity instanceof Alloy.Backbone.Collection;
  };

  getValues = function(model, fields) {
    return fields.map(function(field) {
      var value;
      value = model.get(field);
      if (_.isObject(value)) {
        return JSON.stringify(value);
      } else {
        return value;
      }
    });
  };

  checkError = function(resp) {
    if (toString.call(resp) === '[object Error]') {
      return resp;
    }
    if (_.isString(resp)) {
      return new Error(resp);
    }
    if (resp) {
      return null;
    }
    return new Error("Response is empty");
  };

  requestId = (function() {
    var id;
    id = 0;
    return function() {
      return id++;
    };
  })();

  info = function() {
    var args, ref;
    args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
    return (ref = Ti.API).info.apply(ref, ["[TiResty]"].concat(slice.call(args)));
  };

  warn = function() {
    var args, ref;
    args = 1 <= arguments.length ? slice.call(arguments, 0) : [];
    return (ref = Ti.API).warn.apply(ref, ["[TiResty]"].concat(slice.call(args)));
  };

  syncDebug = function(method, mode, entity, options) {
    var collection, entityType, syncNo;
    if (options.debug) {
      collection = options.collection_name;
      entityType = entityIsCollection(entity) ? 'collection' : 'model';
      syncNo = options.syncNo;
      info("[" + syncNo + "*] " + method + " #" + mode + " '" + collection + "' " + entityType);
      return info("options: " + (JSON.stringify(options)));
    }
  };

  remoteSyncDebug = function(method, options) {
    var collection, syncNo;
    if (options.debug) {
      syncNo = options.syncNo;
      collection = options.collection_name;
      return info("[" + syncNo + "] remote " + method + " '" + collection + "'...");
    }
  };

  remoteSuccessDebug = function(method, options, resp) {
    var collection, count, ref, syncNo;
    if (options.debug) {
      count = (ref = resp.length) != null ? ref : 1;
      syncNo = options.syncNo;
      collection = options.collection_name;
      info("[" + syncNo + "] remote " + method + " '" + collection + "' ok");
      return info(count + " values: " + (JSON.stringify(resp)));
    }
  };

  remoteErrorDebug = function(method, options, err) {
    var collection, syncNo;
    if (options.debug) {
      syncNo = options.syncNo;
      collection = options.collection_name;
      return warn("[" + syncNo + "] remote " + method + " '" + collection + "' failed: " + err);
    }
  };

  requestDebug = function(options, type, url) {
    var syncNo;
    if (options.debug) {
      syncNo = options.syncNo;
      return info("[" + syncNo + "] " + type + " " + url);
    }
  };

  localSyncDebug = function(method, options, sql, table) {
    var sqlDebug, syncNo;
    if (options.debug) {
      syncNo = options.syncNo;
      sqlDebug = sql ? JSON.stringify(sql) : "default sql";
      return info("[" + syncNo + "] local " + method + " '" + table + "': " + sqlDebug + " ...");
    }
  };

  localSuccessDebug = function(method, options, table, resp) {
    var count, ref, syncNo;
    if (options.debug) {
      syncNo = options.syncNo;
      count = (ref = resp.length) != null ? ref : 1;
      return info("[" + syncNo + "] local " + method + " '" + table + "' ok; " + count + " values");
    }
  };

  localErrorDebug = function(method, options, table) {
    var syncNo;
    if (options.debug) {
      syncNo = options.syncNo;
      return warn("[" + syncNo + "] local " + method + " '" + table + "' failed");
    }
  };

  if (Alloy.Backbone.VERSION === '0.9.2') {
    Alloy.Backbone.setDomLibrary({
      ajax: request
    });
  } else {
    Alloy.Backbone.ajax = request;
  }

  module.exports.sync = sync;

  module.exports.beforeModelCreate = SQLAdapter.beforeModelCreate;

  module.exports.afterModelCreate = SQLAdapter.afterModelCreate;

}).call(this);
