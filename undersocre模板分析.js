/*
 *underscore.js的模板方法分析
 *by tzw 2015/8/3
*/


var entityMap = {
    //用于html转义，/<%([\s\S]+?)%>/g 该模式下使用
    escape: {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;'
    }
};
//匹配的三种模式
_.templateSettings = {
    evaluate: /<%([\s\S]+?)%>/g,
    interpolate: /<%=([\s\S]+?)%>/g,
    escape: /<%-([\s\S]+?)%>/g
};
/*
*正则表达式的非贪婪匹配
*默认情况下量词的匹配（*，？，+，{n}）等是贪婪匹配，即匹配到最多的项
*如 "abccccccccdefg".match(/abc+/)    -- ["abcccccccc"]
*而在这些量词后面加上？后悔变为非贪婪匹配，即匹配到最小
*如 "abccccccccdefg".match(/abc+?/)   -- ["ab"]
*/


/************以下是使用的工具函数 start **************/
var nativeKeys = Object.keys;  //返回该对象的所有可枚举自身属性的属性名组成的字符串数组["",""]
_.keys = nativeKeys || function(obj) { //keys方法实现
    if (obj !== Object(obj)) throw new TypeError('Invalid object');
    var keys = [];
    for (var key in obj)
        if (_.has(obj, key)) keys[keys.length] = key; // 直接用length做为下标，挺好
    return keys;
};
// Regexes containing the keys and values listed immediately above.
var entityRegexes = {
    escape: new RegExp('[' + _.keys(entityMap.escape).join('') + ']', 'g'),
    unescape: new RegExp('(' + _.keys(entityMap.unescape).join('|') + ')', 'g')
};

// Functions for escaping and unescaping strings to/from HTML interpolation.
_.each(['escape', 'unescape'], function(method) {
    _[method] = function(string) {
        if (string == null) return '';
        return ('' + string).replace(entityRegexes[method], function(match) {
            return entityMap[method][match]; //转义
        });
    };
});
//即生成的_.escape为(这个不是源码的)
_.escape = function(string){
    if(string == null) return '';
    return ('' + string).replace(/[&<>"'\/]/g, function(match) {
        return entityMap['escape'][match];
    });
}


var escapes = {
    "'": "'",
    '\\': '\\',
    '\r': 'r',
    '\n': 'n',
    '\t': 't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
};
var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;

/*********
 *template代码
************/
_.template = function(text, data, settings) {
    var render;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = new RegExp([
        (settings.escape || noMatch).source, (settings.interpolate || noMatch).source, (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');  //生成后变为  /<%-([\s\S]+?)%>|<%=([\s\S]+?)%>|<%([\s\S]+?)%>|$/g，即三种模式，<%-转义，<%=赋值，<% js

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";

    //**************replace的function处理******************
    // function函数具有几个参数：
    // 第一个参数为每次匹配的文本
    // 中间参数为子表达式匹配字符串，个数不限，也就是括号中的东西
    // 倒数第二个参数为匹配文本字符串的匹配下标位置
    // 最后一个参数表示字符串本身
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) { 
        source += text.slice(index, offset)   // 根据匹配到的位置，取出不做匹配的代码段
            .replace(escaper, function(match) {  //做转义
                return '\\' + escapes[match];
            });

        //以下三个if 分别是对匹配到的字符串做转义
        if (escape) {
            source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
        }
        if (interpolate) {
            source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
        }
        if (evaluate) {
            source += "';\n" + evaluate + "\n__p+='";
        }
        index = offset + match.length;   //将新index位置后移到match之后
        return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
        "print=function(){__p+=__j.call(arguments,'');};\n" +
        source + "return __p;\n";

    try {
        render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
        e.source = source;
        throw e;
    }

    if (data) return render(data, _); //如果初期已经传递了data数据，则直接调用render方法生成html
    var template = function(data) {
        return render.call(this, data, _);
    };

    // Provide the compiled function source as a convenience for precompilation.
    template.source = 'function(' + (settings.variable || 'obj') + '){\n' + source + '}';

    return template;  // 没有传递data数据，则先调用template生成render，然后在传递data生成html
};

//**************解析过程(以下面这个模板为例)******************
//**************解析过程(以下面这个模板为例)******************
<ul id="type_id">
    <% for (var i = 0, len = data.length; i < len; i++) { %>
    <li class="type js_type">
        <h2><%=data[i].name%></h2>
        <ul class="product_list">
            <% for (var j = 0, len1 = data[i].product.length; j < len1; j++) { %>
                <li class="product">
                    <%=data[i].product[j].name%>
                </li>
            <% } %>
        </ul>
    </li>
    <% } %>
</ul>


//**************步骤1. <% for (var i = 0, len = data.length; i < len; i++) { %>******************
source = 
"__p+='<ul id="type_id">\n    ';
 for (var i = 0, len = data.length; i < len; i++) { 
__p+='"


//**************步骤2. <%=data[i].name%>******************
source=
"__p+='<ul id="type_id">\n    ';
 for (var i = 0, len = data.length; i < len; i++) { 
__p+='\n    <li class="type js_type">\n        <h2>'+
((__t=(data[i].name))==null?'':__t)+
'"

//**************步骤3. 模板解析完后******************
source= 
"__p+='<ul id="type_id">\n    ';
 for (var i = 0, len = data.length; i < len; i++) { 
__p+='\n    <li class="type js_type">\n        <h2>'+
((__t=(data[i].name))==null?'':__t)+
'</h2>\n        <ul class="product_list">\n            ';
 for (var j = 0, len1 = data[i].product.length; j < len1; j++) { 
__p+='\n                <li class="product">\n                    '+
((__t=(data[i].product[j].name))==null?'':__t)+
'\n                </li>\n            ';
 } 
__p+='\n        </ul>\n    </li>\n    ';
 } 
__p+='\n</ul>';
"

//**************步骤4. 追加with，生成作用域，也可以不适用with，with有性能问题******************
"with(obj||{}){
__p+='<ul id="type_id">\n    ';
 for (var i = 0, len = data.length; i < len; i++) { 
__p+='\n    <li class="type js_type">\n        <h2>'+
((__t=(data[i].name))==null?'':__t)+
'</h2>\n        <ul class="product_list">\n            ';
 for (var j = 0, len1 = data[i].product.length; j < len1; j++) { 
__p+='\n                <li class="product">\n                    '+
((__t=(data[i].product[j].name))==null?'':__t)+
'\n                </li>\n            ';
 } 
__p+='\n        </ul>\n    </li>\n    ';
 } 
__p+='\n</ul>';
}
"

//**************步骤5. 组装source，追加_t,_p等变量定义******************
"var __t,__p='',__j=Array.prototype.join,print=function(){__p+=__j.call(arguments,'');};
with(obj||{}){
__p+='<ul id="type_id">\n    ';
 for (var i = 0, len = data.length; i < len; i++) { 
__p+='\n    <li class="type js_type">\n        <h2>'+
((__t=(data[i].name))==null?'':__t)+
'</h2>\n        <ul class="product_list">\n            ';
 for (var j = 0, len1 = data[i].product.length; j < len1; j++) { 
__p+='\n                <li class="product">\n                    '+
((__t=(data[i].product[j].name))==null?'':__t)+
'\n                </li>\n            ';
 } 
__p+='\n        </ul>\n    </li>\n    ';
 } 
__p+='\n</ul>';
}
return __p;
"

//**************步骤6. new Function 来生成一个匿名函数给render******************
render = new Function(settings.variable || 'obj', '_', source); //最后一个是函数内容，之前的为参数

render：obj为调用render的时候传递的data参数
function (obj, _) {
    var __t, __p = '',
        __j = Array.prototype.join,
        print = function() {  //没发现哪里使用
            __p += __j.call(arguments, '');
        };
    with(obj || {}) {
        __p += '<ul id="type_id">\n    ';
        for (var i = 0, len = data.length; i < len; i++) {
            __p += '\n    <li class="type js_type">\n        <h2>' +
                ((__t = (data[i].name)) == null ? '' : __t) +
                '</h2>\n        <ul class="product_list">\n            ';
            for (var j = 0, len1 = data[i].product.length; j < len1; j++) {
                __p += '\n                <li class="product">\n                    ' +
                    ((__t = (data[i].product[j].name)) == null ? '' : __t) +
                    '\n                </li>\n            ';
            }
            __p += '\n        </ul>\n    </li>\n    ';
        }
        __p += '\n</ul>';
    }
    return __p;
}
