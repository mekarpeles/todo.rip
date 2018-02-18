var redux;
var resortTodoBuckets;

$(document).ready(function () {
  "use strict";

  var days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  redux = {};

  var linkifyDependencies = function(dependencies) {
    var links = [];
    for (var dependency in dependencies) {
      var d = dependencies[dependency];
      links.push('<a href="/admin?id=' + d.id + '">' + d.question + '</a>');
    }
    return links.join(', ');
  }

  $('form.search').submit(function(e) {
    e.preventDefault();
    $('#app .serp').remove();

    var query = $('.searchBox').val();

    if (query[0] === '/') {
      var tokens = query.split(' ');
      var directive = tokens.shift()
      var todo_id = tokens.shift().replace('#', '')
      var payload = tokens.join(' ');

      //Todo.update(todo_id, {}, function(data) { ... }
    }

    $.ajax({
      type: 'POST',
      url: 'https://api.todo.rip/todos',
      data: $('.search').serialize(),
      success: function(data) {
        var todo = data.todo;
        if (data.success) {
          $('.feedback').empty();
          $('.feedback').text(data.success + ": " + todo.id);
        }

        if (todo.id) {
          rm_todo(todo.id)
          add_todo(todo);
        }
        $('.searchBox').val('')
      }
    });
    return false;
  })

  
  $(document).on("keyup", ".searchBox", function() {
    $('#app .serp').remove();

    var query = $('.searchBox').val();
    var tokens = query.split(' ');

    if (query[0] === '/') {
      tokens.shift();
      if (tokens.length && Number.isInteger(parseInt(tokens[0].replace('#', '')))) {
        $('#app').prepend('<div class="bucket serp"><h3>Auto-Completions...</h3><ul class="todos"></ul></div>');
        var todo_id = parseInt(tokens[0].replace('#', ''));
        Todo.get(todo_id, function(data) {
          console.log(data);
          $('#app .serp ul.todos').append(add_todo_item(data));
        })
      } else {
        query = tokens.join(' ');
        if (query) {
          $('#app').prepend('<div class="bucket serp"><h3>Auto-Completions...</h3><ul class="todos"></ul></div>');
          console.log(query);
          Todo.search(query, function(data) {
            var todos = data.todos;
            $(todos).each(function(index, t) {
              $('#app .serp ul.todos').append(add_todo_item(t));
            });
          })
        }
      }
    } else {
      var query = $('.searchBox').val();
      if (query) {
        $('#app').prepend('<div class="bucket serp"><h3>Auto-Completions...</h3><ul class="todos"></ul></div>');
        Todo.search(query, function(matches) {
          var todos = matches.todos;
          $(todos).each(function(index, t) {
            $('#app .serp').append(add_todo_item(t));
          });
        });
      }
    }
  });


  var SearchComponent = {
    render: function() {
      $('#app').append('<ul class="searchResults"></ul>');
    }
  }


  var TodoComponent = {
    render: function(question) {
      $('.todos').empty();
      $('#app').append(
        '<div class="todo">' +
          '<h3>' + question.question + '</h3>' + 
          '<hr/>' +
          '<h4>Answers</h4>' +
          question.answers + 
        '</div>');
    }
  };

  var topic_tagify = function(topics) {
    var tags = '';
    for (var t in topics) {
      var topic = topics[t]
      tags += '<a href="" class="topic">' + topic.name + '</a>';
    }
    return tags;
  }

  var rm_todo = function(todo_id) {
    $('[todo-id="' + todo_id + '"]').remove()
  }

  var add_todo_item = function(t) {
    var status = t.status.name.toLowerCase().replace(' ', '-')
    return '<li class="todo-item"  todo-id="' + t.id + '">' +
      '<div class="status ' + status + '"></div>' +
      '<div class="todo-id todo-item-section">T' + t.id + '</div>' +
      '<div class="todo-item-title todo-item-section"><a href="/admin?id=' + t.id + '">' + t.desc + '</a>' + 
      (t.status.days_active !== undefined ? '<div class="days-active">(' + t.status.days_active +
     ' days active)</div>': '') + '</div>' +
      '<div class="todo-item-topics">' + topic_tagify(t.topics) + '</div>' +      
      '</div>'
  }

  var timestamp = function(d) {
    return d.getUTCFullYear()  + '-' + (d.getUTCMonth() + 1) + 
      '-' + (d.getDate());
  }

  var days_open = function(t) {
    return today - (new Data(t.status.timestamp));
  }

  var add_todo = function(t, resort) {
    var today = new Date();
    var today_ds = timestamp(today);

    if (t.status.name === 'Backlog') {
      if (! $('.backlogs').length) {
        $('#app').append('<div class="bucket" bucket="backlogs"><h3>Backlog</h3><hr/><ul class="todos backlogs"></ul></div>');
      }
      $('.backlogs').append(add_todo_item(t));
    } else if (t.status.name === 'In Progress' || t.status.name === 'Complete') {
      var d = t.status.name === 'In Progress' ? new Date() : new Date(t.status.timestamp);
      var ds = timestamp(d);
      if (! $('.time-' + ds).length) {
        var dow = days[d.getDay()];
        $('#app').append(
          '<div class="bucket" bucket="' + ds + '"><h3>' + ds + ' ' + dow + ' ' +
            (ds == today_ds || t.status.name === 'In Progress' ? ' (Today)': '') +
            '</h3><hr/><ul class="todos time-' + ds + '" bucket="' + ds +            
            '"></ul></div>');
      }
      $('.time-' + ds).append(add_todo_item(t));
    }
    if (resort) {
      resortTodoBuckets();
    }
  }
  
  resortTodoBuckets = function() {
    var lst = [];    
    $('#app').children().each(function(i, node) {
      var add = true;
      for (var l in lst) {
        var item = lst[l];
        
        if ($(item).attr('bucket') === 'backlogs') {
          lst.splice(l, 0, $(node));
          add = false;
        } else if ($(node).attr('bucket') !== 'backlogs') {
          var a = $(node).attr('bucket').split('-')
          var a_year = parseInt(a[0]);
          var a_month = parseInt(a[1]);
          var a_day = parseInt(a[2]);
          var b = $(item).attr('bucket').split('-')
          var b_year = parseInt(b[0]);
          var b_month = parseInt(b[1]);
          var b_day = parseInt(b[2]);
          if (a_year > b_year) {
            lst.splice(l, 0, $(node));  
            add = false;
          } else if (a_year == b_year) {
            if (a_month > b_month) {
              lst.splice(l, 0, $(node));
              add = false;
            } else if (a_month == b_month) {
              if (a_day > b_day) {
                lst.splice(l, 0, $(node));
                add = false;
              }
            }
          }
        }
      }
      if (add) {
        lst.push($(node));
      }
    });

    var html = '';
    var last = null;
    for (var l in lst) {
      var item = lst[l];
      if (!last || last.html() != lst[l].html()) {
        html += '<div class="bucket" bucket="' + item.attr('bucket') + '">' + item.html() + '</div>';
      }
      last = item;
    }
    $('#app').empty()
    $('#app').html(html)
  }

  var TodoIndexComponent = {
    render: function(todos) {
      $('#app').empty();
      $(todos.reverse()).each(function(index, t) {
        add_todo(t, false);
      });
      resortTodoBuckets();
    }
  }

  // init
  var options = Browser.getJsonFromUrl();
  var seedId = Browser.getUrlParameter('id');
  if (seedId) {
    try {
      Todo.get(seedId, function(todo) {
        SearchComponent.render();
        TodoComponent.render(todo)
      });
    } catch(e) {
      console.log('id must be a valid integer Entity ID');
    }
  } else {
    Todo.all(function(response) {
      SearchComponent.render();
      var todos = response.todos;
      if (!jQuery.isEmptyObject(todos)) {
        TodoIndexComponent.render(todos);
      }
    });

  }

});