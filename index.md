<style>
  #post-index {
    list-style: none;
    font-size: 24px;
  }
  #post-index > li {
     color: #000;
  }
</style>

<ul id="post-index" class="posts">
  {% for post in site.posts %}
    <li><a href="{{ site.baseurl }}{{ post.url }}">{{ post.title }}</a></li>
  {% endfor %}
</ul>
