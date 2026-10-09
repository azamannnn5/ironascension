# Real product photos go here

Drop real photos (vials, boxes, labels, etc.) in this folder, named to match
the product, e.g.:

  product-1.jpg
  product-2.jpg
  ...
  product-64.jpg

Then in `/admin.html`, open that product and set its Image field to:

  assets/images/products/product-1.jpg

(or whatever filename you used). You don't have to use this exact naming -
any filename works as long as the Image field points to it - this is just a
convention so it stays easy to tell which photo goes with which product.

Until a real photo is set, the product shows the branded "Product Photo
Coming Soon" placeholder automatically - nothing breaks if this folder is
empty.
