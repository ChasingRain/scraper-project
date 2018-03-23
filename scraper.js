var fs = require('fs');
var http = require('http');
var url = require('url')
const cheerio = require('cheerio');
var jsonexport = require('jsonexport');
let products = [];
let productInfo = [];
let counter = 0;

//create directory
var dir = './data';

if (!fs.existsSync(dir)){
    fs.mkdirSync(dir);
}

http.get('http://shirts4mike.com/shirts.php', (res) => {
  const { statusCode } = res;
  const contentType = res.headers['content-type'];

  let error;
  if (statusCode !== 200) {
    error = new Error('Request Failed.\n' +
                      `Status Code: ${statusCode}`);
  }else if (!/^text\/html/.test(contentType)) {
    error = new Error('Invalid content-type.\n' +
                      `Expected application/json but received ${contentType}`);
  }
  if (error) {
    console.error(error.message);
    // consume response data to free up memory
    res.resume();
    return;
  }

  res.setEncoding('utf8');
  let rawData = '';
  res.on('data', (chunk) => { rawData += chunk; });
  res.on('end', () => {
    try {
      const $ = cheerio.load(rawData);
      $('a[href*="shirt.php?id"]').each(function(i){
          let product = {};
          product.url = 'http://shirts4mike.com/' + $(this).attr('href');
          product.id = product.url.substr(product.url.length - 3)
          product.img = $("img", this).attr('src');
          http.get(product.url, (res) => {
            const { statusCode } = res;
            const contentType = res.headers['content-type'];

            let error;
            if (statusCode !== 200) {
              error = new Error('Request Failed.\n' +
                                `Status Code: ${statusCode}`);
            }else if (!/^text\/html/.test(contentType)) {
              error = new Error('Invalid content-type.\n' +
                                `Expected application/json but received ${contentType}`);
            }
            if (error) {
              console.error(error.message);
              // consume response data to free up memory
              res.resume();
              return;
            }

            res.setEncoding('utf8');
            let rawData = '';
            res.on('data', (chunk) => { rawData += chunk; });
            res.on('end', () => {
              try {
                let productDetails = {}
                let urlQuery = require('url').parse(product.url)
                productDetails.id = urlQuery.query.substr(urlQuery.query.length - 3);
                const $ = cheerio.load(rawData);
                productDetails.price = $('.price').html();
                productDetails.title = $('.shirt-picture img').attr('alt');
                var d = new Date();
                productDetails.time = d.toString();
                products.find(x => x.id === productDetails.id).price = productDetails.price;
                products.find(x => x.id === productDetails.id).title = productDetails.title;
                products.find(x => x.id === productDetails.id).time = productDetails.time;
                counter += 1;
                if(counter === products.length){
                  finish();
                }
              } catch (e) {
                console.error(e.message);
              }
            });
          }).on('error', (e) => {
            console.error(`Got error: ${e.message}`);
          });
          products[i] = product;
          })
    } catch (e) {
      console.error(e.message);
    }
  });
}).on('error', (e) => {
  let messageText = 'Not sure what happened. Check your network connection.'
  if(e.code === 'ENOTFOUND'){
    messageText = 'Unable to connect to the network'
  }
  console.error(`Got error: ` + messageText );
});

function finish() {
  products.forEach(function(v){ delete v.id });
  var date = new Date();
  date = date.toLocaleString().replace(/\s/g, '').substring(0,9);
  var options = {
    headers: ['title','price','img','url','time']
  };
  jsonexport(products, options, function(err, csv){
      if(err) return console.log(err);
      var fileName = dir + '/' + date + '.csv'
      fs.writeFile(fileName, csv, 'utf8', function (err) {
        if (err) {
          console.log(err.message);
        } else{
          console.log('Data has been saved/updated!');
        }
      });
    })
}
