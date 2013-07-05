
var mongoose = require('mongoose');

var animeTypes = [
  'OVA',
  'Movie',
  'TV',
  'Special',
  'ONA',
  'Music'
];

var animeStatuses = [
  'Finished Airing',
  'Currently Airing',
  'Not yet aired'
];

var animeGenres = [
  'Action',
  'Adventure',
  'Cars',
  'Comedy',
  'Dementia',
  'Demons',
  'Drama',
  'Ecchi',
  'Fantasy',
  'Game',
  'Harem',
  'Hentai',
  'Historical',
  'Horror',
  'Josei',
  'Kids',
  'Magic',
  'Martial Arts',
  'Mecha',
  'Military',
  'Music',
  'Mystery',
  'Parody',
  'Police',
  'Psychological',
  'Romance',
  'Samurai',
  'School',
  'Sci-Fi',
  'Seinen',
  'Shoujo',
  'Shoujo Ai',
  'Shounen',
  'Shounen Ai',
  'Slice of Life',
  'Space',
  'Sports',
  'Super Power',
  'Supernatural',
  'Thriller',
  'Vampire',
  'Yaoi',
  'Yuri'
];

var animeSchema = new mongoose.Schema({
  myanimelist: {
    type: Number,
    unique: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  japanese: {
    type: String,
    'default': '',
    trim: true
  },
  type: {
    type: String,
    required: true,
    'enum': animeTypes,
    trim: true
  },
  episodes: {
    type: Number,
    min: 0,
    'default': 0
  },
  duration: {
    type: Number,
    min: 0,
    'default': 0
  },
  status: {
    type: String,
    required: true,
    'enum': animeStatuses,
    trim: true
  },
  aired: {
    start: Date,
    end: Date
  },
  rating: {
    type: String,
    required: true,
    trim: true
  },
  synopsis: {
    type: String,
    'default': '',
    trim: true
  },
  genres: [{type: String, 'enum': animeGenres}],
  producers: [String],
  tags: [String],
  picture: {
    original: String,
    thumbnail: String
  },
  _meta: {
    createdAt: {
      type: Date,
      'default': Date.now,
      set: function (val) {
        return undefined;
      }
    },
    updatedAt: {
      type: Date,
      'default': Date.now
    }
  }
});

animeSchema.pre('save', function (next) {
  this._meta.updatedAt = Date.now;
  next();
});

animeSchema.methods.setMultiple = function (data) {

  if (data.myanimelist) this.myanimelist = data.myanimelist;
  if (data.title) this.title = data.title;
  if (data.japanese) this.japanese = data.japanese;
  if (data.type) this.type = data.type;
  if (data.episodes) this.episodes = data.episodes;
  if (data.duration) this.duration = data.duration;
  if (data.status) this.status = data.status;
  
/*
  if (data.aired.start) {
    this.aired.start = new Date(data.aired.,,);
  }
  if (data.aired.end) {
    this.aired.end = data.aired.end;
  }
  if (data.rating) this.rating = data.rating;
  if (data.synopsis) this.synopsis = data.synopsis;

  this.genres = [];
  this.producers = [];
  this.tags = [];
*/

}

animeSchema.statics.types = function () {
  return animeTypes;
}

animeSchema.statics.statuses = function () {
  return animeStatuses;
}

animeSchema.statics.genres = function () {
  return animeGenres;
}

animeSchema.statics.fetch = function (id, callback) {
  var request = require('request');

  request('http://myanimelist.net/anime/' + id, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var cheerio = require('cheerio')
        , $ = cheerio.load(body);

      if ($('div').hasClass('badresult')) {
        callback(null);
        return;
      }

      var data = {
        myanimelist: parseInt(id),
        title: $('#contentWrapper h1 div').remove().parent().text().trim(),
        japanese: '',
        type: '',
        episodes: 0,
        duration: 0,
        status: '',
        aired: {
          start: null,
          end: null
        },
        rating: '',
        synopsis: '',
        genres: [],
        producers: [],
        tags: []
      };

      $('span.dark_text').each(function() {
        var item = $(this);
        switch(item.text()) {
          case 'Japanese:':
            data.japanese = item.remove().parent().text().trim();
            break;
          case 'Type:':
            data.type = item.remove().parent().text().trim();
            break;
          case 'Episodes:':
            data.episodes = parseInt(item.remove().parent().text());
            break;
          case 'Status:':
            data.status = item.remove().parent().text().trim();
            break;
          case 'Aired:':
            var aired = item.remove().parent().text().trim().split('to');
            var start = new Date(aired[0].trim());
            if (start) {
              data.aired.start = {
                day: start.getDate(),
                month: start.getMonth() + 1,
                year: start.getFullYear()
              };
            }
            if (aired.length > 1) {
              var end = new Date(aired[1].trim());
              if (end) {
                data.aired.end = {
                  day: end.getDate(),
                  month: end.getMonth() + 1,
                  year: end.getFullYear()
                };
              }
            }
            break;
          case 'Producers:':
            var producers = item.remove().parent().text().trim().split(',');
            for (var index in producers)
              data.producers.push(producers[index].trim());
            break;
          case 'Genres:':
            var genres = item.remove().parent().text().trim().split(',');
            for (var index in genres)
              data.genres.push(genres[index].trim());
            break;
          case 'Duration:':
            var duration = item.remove().parent().text().trim();
            if (/(\d+) hr./g.test(duration))
              data.duration += parseInt(RegExp.lastParen) * 60;
            if (/(\d+) min./g.test(duration))
              data.duration += parseInt(RegExp.lastParen);
            break;
          case 'Rating:':
            data.rating = item.remove().parent().text().trim();
            break;
          default:
            break;
        }
      });
      $('h2').each(function() {
        if ($(this).text() == 'Popular Tags') {
          $(this).next().find('a').each(function() {
            data.tags.push( $(this).text().trim() );
          });
        } else if ($(this).text() == 'Synopsis') {
          data.synopsis = $(this).remove().parent().text().trim();
        }
      });
      callback(data);
    } else {
      callback(null);
    }
  });
}

var Anime = mongoose.model('Anime', animeSchema);

Anime.schema.path('myanimelist').validate(function (value) {
  return value > 0;
}, 'Invalid myanimelist id value.');

Anime.schema.path('title').validate(function (value) {
  return value.length > 0;
}, 'Title is required.');

Anime.schema.path('type').validate(function (value) {
  return animeTypes.indexOf(value) >= 0;
}, 'Invalid type value. should be ' + animeTypes.join(', ') + '.');

Anime.schema.path('episodes').validate(function (value) {
  return value >= 0;
}, 'Invalid episodes value, should be a positive number.');

Anime.schema.path('duration').validate(function (value) {
  return value >= 0;
}, 'Invalid duration value, should be a positive number.');

Anime.schema.path('status').validate(function (value) {
  return animeStatuses.indexOf(value) >= 0;
}, 'Invalid status value. should be ' + animeStatuses.join(', ') + '.');

module.exports = Anime;
