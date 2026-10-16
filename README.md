# React Hooks Notes: `useCallback`, `useEffect`, Strict Mode & React Compiler

> **আমার শেখার নোট** --- React ও Next.js-এ function reference, Effect
> dependency এবং memoization কীভাবে কাজ করে।

------------------------------------------------------------------------

## 📚 সূচিপত্র

-   [১. প্রতি render-এ function কেন নতুন হতে
    পারে?](#১-প্রতি-render-এ-function-কেন-নতুন-হতে-পারে)
-   [২. `useEffect` ও dependency array](#২-useeffect-ও-dependency-array)
-   [৩. `useCallback` কী এবং কখন ব্যবহার
    করব?](#৩-usecallback-কী-এবং-কখন-ব্যবহার-করব)
-   [৪. `React.memo` + `useCallback`
    উদাহরণ](#৪-reactmemo--usecallback-উদাহরণ)
-   [৫. Stale closure এড়ানো](#৫-stale-closure-এড়ানো)
-   [৬. Banner component experiment](#৬-banner-component-experiment)
-   [৭. Strict Mode কেন অতিরিক্ত log দেখাতে
    পারে?](#৭-strict-mode-কেন-অতিরিক্ত-log-দেখাতে-পারে)
-   [৮. React Compiler-এর প্রভাব](#৮-react-compiler-এর-প্রভাব)
-   [৯. `'use no memo'` দিয়ে পরীক্ষা](#৯-use-no-memo-দিয়ে-পরীক্ষা)
-   [১০. দ্রুত মনে রাখার সূত্র](#১০-দ্রুত-মনে-রাখার-সূত্র)
-   [১১. পরের ধাপে শিখব](#১১-পরের-ধাপে-শিখব)

------------------------------------------------------------------------

## ১. প্রতি render-এ function কেন নতুন হতে পারে?

React component সাধারণত একটি function। Component আবার render হলে তার
body আবার execute হয়। তাই body-র ভেতরে declare করা সাধারণ function-ও
সাধারণত নতুন reference পায়।

``` js
(() => {}) === (() => {}); // false
```

দুটি function দেখতে একই হলেও তারা আলাদা function object।

``` tsx
const sayHello = () => {
  console.log('Hello');
};
```

`Banner` আবার render হলে, React Compiler memoization না করলে, `sayHello`
সাধারণত নতুন reference পাবে।

> **মনে রাখুন:** এটা নিজে থেকে কোনো bug নয়। সমস্যা হতে পারে যখন function
> reference অন্য কিছুর সঙ্গে তুলনা করা হয়---যেমন `useEffect` dependency বা
> `memo` করা child component-এর prop।

------------------------------------------------------------------------

## ২. `useEffect` ও dependency array

`useEffect` render-এর পরে external system-এর সঙ্গে কাজ করার জন্য ব্যবহার
করা হয়---যেমন API request, subscription, browser event listener বা
document title আপডেট করা।

``` tsx
useEffect(() => {
  // Effect-এর কাজ
}, [dependencies]);
```

### Dependency array-এর তিনটি ধরন

  -------------------------------------------------------------------------
  কোড                                   কখন Effect চলে?
  ------------------------------------- -----------------------------------
  `useEffect(() => { ... })`            প্রতিটি committed render-এর পরে

  `useEffect(() => { ... }, [])`        Mount-এর পরে; Strict Mode-এ
                                        development-এ অতিরিক্ত setup/cleanup
                                        cycle হতে পারে

  `useEffect(() => { ... }, [count])`   প্রথম mount-এর পরে এবং `count`
                                        পরিবর্তিত হলে
  -------------------------------------------------------------------------

### Dependency মানে function call নয়

``` tsx
useEffect(() => {
  console.log('Effect চলছে');
}, [sayHello]);
```

এখানে `sayHello` call করা হচ্ছে না। React আগের render-এর dependency-এর
সঙ্গে বর্তমান dependency তুলনা করে। Dependency পরিবর্তিত হলে Effect আবার
চলে।

  লেখা           অর্থ
  -------------- --------------------
  `sayHello`     Function reference
  `sayHello()`   Function call

### Effect dependency-তে function থাকলে

``` tsx
const sayHello = () => {
  console.log('Hello');
};

useEffect(() => {
  console.log('sayHello-এর dependency বদলেছে');
}, [sayHello]);
```

সাধারণভাবে, `sayHello` প্রতি render-এ নতুন reference পেলে Effect প্রতিটি
committed render-এর পর আবার চলবে।

### Infinite loop-এর একটি সাধারণ ধরন

``` tsx
useEffect(() => {
  setCount(count + 1);
}, [count]);
```

`count` বদলায় → Effect চলে → `count` আবার বদলায় → Effect আবার চলে। এভাবে
অনবরত চলতে পারে।

API request-এর ক্ষেত্রে `[]` দিলেই সব সময় সঠিক সমাধান হয় না। Dependency-তে
ব্যবহৃত reactive value সঠিকভাবে অন্তর্ভুক্ত করতে হবে এবং প্রয়োজন অনুযায়ী request
cancellation বা cleanup বিবেচনা করতে হবে।

------------------------------------------------------------------------

## ৩. `useCallback` কী এবং কখন ব্যবহার করব?

`useCallback` dependency পরিবর্তন না হওয়া পর্যন্ত একই function reference
ধরে রাখতে সাহায্য করে।

``` tsx
import { useCallback } from 'react';

const sayHello = useCallback(() => {
  console.log('Hello');
}, []);
```

এখানে `[]` বোঝায় callback-এর কোনো reactive dependency নেই।

### কখন কাজে লাগে?

1.  **`memo` করা child-এ callback prop পাঠালে:** reference স্থির থাকলে
    child-এর অপ্রয়োজনীয় re-render এড়ানো যেতে পারে।
2.  **Function কোনো Hook-এর dependency হলে:** reference স্থিতিশীল রাখলে
    অপ্রয়োজনীয় Effect পুনরায় চলা এড়ানো যেতে পারে।
3.  **Performance সমস্যা শনাক্ত হলে:** Profiler দিয়ে যাচাই করে প্রয়োজনমতো
    memoization করা যায়।

### কখন প্রয়োজন নাও হতে পারে?

-   Function কোনো memoized child-এ prop হিসেবে যাচ্ছে না।
-   Function-এর reference অন্য কোথাও গুরুত্বপূর্ণ নয়।
-   Component ছোট এবং performance সমস্যা নেই।
-   `useCallback` ব্যবহার করলে বাস্তব কোনো লাভ হচ্ছে না।

> **সতর্কতা:** শুধু function আছে বলেই `useCallback` ব্যবহার করবেন না। আগে
> বুঝুন function reference স্থিতিশীল রাখার প্রয়োজন আছে কি না।

------------------------------------------------------------------------

## ৪. `React.memo` + `useCallback` উদাহরণ

``` tsx
import { memo, useCallback, useState } from 'react';

type Product = {
  id: number;
  name: string;
};

type ProductCardProps = {
  product: Product;
  onWishlist: (id: number) => void;
};

const ProductCard = memo(function ProductCard({
  product,
  onWishlist,
}: ProductCardProps) {
  console.log('Render হচ্ছে:', product.name);

  return (
    <div>
      <h3>{product.name}</h3>
      <button onClick={() => onWishlist(product.id)}>
        Add to wishlist
      </button>
    </div>
  );
});

export default function Products() {
  const [search, setSearch] = useState('');
  const [wishlist, setWishlist] = useState<number[]>([]);

  const products: Product[] = [
    { id: 1, name: 'iPhone 12' },
    { id: 2, name: 'Samsung S21' },
  ];

  const handleWishlist = useCallback((id: number) => {
    setWishlist((previous) => [...previous, id]);
  }, []);

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search products"
      />

      {filteredProducts.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onWishlist={handleWishlist}
        />
      ))}

      <p>Wishlist items: {wishlist.length}</p>
    </>
  );
}
```

### এখানে কী হচ্ছে?

-   Search input-এ টাইপ করলে `Products` re-render হয়।
-   `handleWishlist`-এর reference স্থির থাকে, কারণ `useCallback` ব্যবহার
    করা হয়েছে।
-   `ProductCard` `memo` করা, তাই তার props অপরিবর্তিত থাকলে card সাধারণত
    re-render করে না।
-   `search` অনুযায়ী filtered list বদলালে কোনো card যোগ বা বাদ পড়তে
    পারে---এটা স্বাভাবিক।
-   `products` array component-এর ভেতরে তৈরি হওয়ায় প্রতিবার নতুন array ও
    object reference পায়। এই উদাহরণে `product` prop-এর reference বদলালে
    `memo` card re-render করতে পারে। পুরো list-কে স্থির রাখতে চাইলে
    data-কে component-এর বাইরে রাখা বা প্রয়োজন অনুযায়ী memoization বিবেচনা
    করা যায়।

এখানে functional state update ব্যবহার করা হয়েছে:

``` tsx
setWishlist((previous) => [...previous, id]);
```

তাই callback-এর ভেতরে বর্তমান `wishlist` value পড়তে হচ্ছে না, এবং
dependency array খালি রাখা যায়।

------------------------------------------------------------------------

## ৫. Stale closure এড়ানো

Callback-এর ভেতরে কোনো state বা prop ব্যবহার করলে dependency সঠিকভাবে
দিতে হবে। না হলে function পুরোনো value ধরে রাখতে পারে---এটাকে stale
closure বলা হয়।

### ভুল উদাহরণ

``` tsx
const handleClick = useCallback(() => {
  console.log(count);
}, []); // count dependency-তে নেই
```

এখানে callback পুরোনো `count` value দেখতে পারে।

### সংশোধিত উদাহরণ

``` tsx
const handleClick = useCallback(() => {
  console.log(count);
}, [count]);
```

যদি state-এর আগের value-এর ওপর update নির্ভর করে, functional update
ব্যবহার করতে পারেন:

``` tsx
const increment = useCallback(() => {
  setCount((previous) => previous + 1);
}, []);
```

------------------------------------------------------------------------

## ৬. Banner component experiment

আমার পরীক্ষার component:

``` tsx
'use client';

import { useEffect, useState } from 'react';

export default function Banner() {
  const [count, setCount] = useState(0);

  const sayHello = () => {
    console.log('Hello');
  };

  console.log('Banner render হয়েছে');

  useEffect(() => {
    console.log('sayHello dependency-এর কারণে Effect চলছে');
  }, [sayHello]);

  return (
    <button onClick={() => setCount((previous) => previous + 1)}>
      Count: {count}
    </button>
  );
}
```

### কী আশা করা যায়?

-   `sayHello()` কোথাও call করা হয়নি, তাই `Hello` log হবে না।
-   Component body-র `console.log` প্রতিবার component render হলে চলে।
-   Compiler সাধারণ function-টিকে memoize না করলে `sayHello`-এর
    reference প্রতিটি render-এ বদলাবে। সে ক্ষেত্রে Effect-ও প্রতিটি
    committed render-এর পরে চলবে।
-   Development-এ Strict Mode initial render ও Effect-এর অতিরিক্ত
    execution ঘটাতে পারে।

### আমার experiment-এ কী দেখেছি?

-   শুরুতে `Banner render হয়েছে` এবং Effect-এর message দুবার দেখেছি।
-   Count বাড়ালে `Banner render হয়েছে` বারবার এসেছে।
-   কিন্তু Effect-এর message আর আসেনি।

এই ফলাফল থেকে একা নিশ্চিত হওয়া যায় না যে React Compiler-ই কারণ। Next.js
configuration, Compiler-এর প্রকৃত সক্রিয়তা, Strict Mode এবং Console-এর
log---সব যাচাই করতে হবে।

------------------------------------------------------------------------

## ৭. Strict Mode কেন অতিরিক্ত log দেখাতে পারে?

React Strict Mode development-এ কিছু কাজ অতিরিক্তবার চালিয়ে সম্ভাব্য bug
খুঁজতে সাহায্য করে।

-   Component render অতিরিক্তবার হতে পারে।
-   Initial mount-এর সময় Effect-এর setup → cleanup → setup cycle হতে
    পারে।
-   এটা production-এ Strict Mode-এর এই development-only পরীক্ষা হিসেবে
    ঘটে না।

তবে **প্রতিটি state update-এ Effect দুবার চলবেই---এমন নয়**। Update-এর সময়
Effect চলা নির্ভর করে dependency পরিবর্তিত হয়েছে কি না এবং Effect-এর
নিয়মের ওপর।

তাই Strict Mode-কে সব অতিরিক্ত log-এর একমাত্র কারণ ধরে নেওয়া ঠিক নয়।

------------------------------------------------------------------------

## ৮. React Compiler-এর প্রভাব

React Compiler build-এর সময় code বিশ্লেষণ করে অনেক ক্ষেত্রে স্বয়ংক্রিয়ভাবে
memoization যোগ করতে পারে। ফলে হাতে `useCallback`, `useMemo` বা `memo`
লেখার প্রয়োজন কমতে পারে।

উদাহরণ হিসেবে, compiler এমন একটি function-এর reference স্থিতিশীল রাখতে
পারে:

``` tsx
const sayHello = () => {
  console.log('Hello');
};
```

কিন্তু **Compiler প্রতিটি function-কে অবশ্যই memoize করবে---এমন নিশ্চয়তা
নেই**। কী memoize হবে তা compiler-এর analysis, configuration এবং code-এর
ওপর নির্ভর করে।

### Next.js configuration যাচাই

`next.config.ts` বা `next.config.js`-এ compiler-সংক্রান্ত configuration
আছে কি না দেখুন। আপনার Next.js version এবং setup অনুযায়ী configuration
আলাদা হতে পারে।

``` ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // আপনার version ও setup অনুযায়ী React Compiler configuration
};

export default nextConfig;
```

শুধু configuration ফাইলে কোনো option দেখা গেলেই compiler কার্যকরভাবে
memoization করছে---এটা ধরে নেবেন না। আপনার project-এর version,
plugin/setup এবং React DevTools দিয়ে যাচাই করুন।

------------------------------------------------------------------------

## ৯. `'use no memo'` দিয়ে পরীক্ষা

কিছু React Compiler setup-এ opt-out directive হিসেবে `'use no memo'`
ব্যবহার করা যায়। এটি ব্যবহার করার আগে আপনার ব্যবহৃত Compiler version-এর
documentation যাচাই করুন।

``` tsx
'use client';
'use no memo';
```

এটি compiler-কে ওই scope-এ memoization না করতে নির্দেশ দেওয়ার জন্য ব্যবহৃত
হয়---যেখানে আপনার setup এই directive সমর্থন করে।

### পরীক্ষার ধাপ

1.  প্রথমে যাচাই করুন React Compiler আপনার project-এ সক্রিয় কি না।
2.  Console clear করে পেজ refresh করুন।
3.  Count button কয়েকবার click করুন।
4.  `Banner render হয়েছে` ও Effect-এর log কীভাবে বদলায় দেখুন।
5.  আপনার Compiler setup সমর্থন করলে, আলাদা পরীক্ষায় `'use no memo'` দিয়ে
    তুলনা করুন।
6.  এরপর `useCallback` যোগ করে আবার পরীক্ষা করুন।

> `'use no memo'` শেখার বা debugging-এর পরীক্ষায় কাজে লাগতে পারে, কিন্তু
> production code-এ অকারণে যোগ করবেন না।

------------------------------------------------------------------------

## ১০. দ্রুত মনে রাখার সূত্র

1.  সাধারণ component function প্রতি render-এ আবার execute হয়।
2.  সাধারণভাবে component-এর ভেতরে declare করা function প্রতিটি render-এ
    নতুন reference পায়।
3.  `useEffect` dependency-এর আগের ও বর্তমান value তুলনা করে।
4.  Dependency array-তে function-এর নাম রাখলে function call হয় না।
5.  `useCallback` dependency না বদলালে function reference স্থিতিশীল রাখতে
    সাহায্য করে।
6.  `React.memo` child-এর props অপরিবর্তিত থাকলে অপ্রয়োজনীয় render এড়াতে
    পারে।
7.  Strict Mode development-এ অতিরিক্ত render ও initial Effect cycle
    ঘটাতে পারে।
8.  React Compiler অনেক memoization স্বয়ংক্রিয়ভাবে করতে পারে, তবে সব
    ক্ষেত্রে নয়।
9.  `useCallback` সব function-এ ব্যবহার করা দরকার নেই।
10. Performance optimization করার আগে আচরণটি বুঝুন এবং প্রয়োজন হলে Profiler
    দিয়ে যাচাই করুন।

------------------------------------------------------------------------

## ১১. পরের ধাপে শিখব

-   [ ] `next.config`-এ React Compiler সক্রিয় কি না যাচাই করা
-   [ ] `useMemo` ও `useCallback`-এর পার্থক্য
-   [ ] `React.memo` আরও গভীরভাবে বোঝা
-   [ ] `useEffect` cleanup function
-   [ ] React DevTools Profiler দিয়ে re-render পরীক্ষা করা

------------------------------------------------------------------------

**Learning goal:** React-এ render, reference, Effect dependency এবং
memoization কীভাবে একে অপরের সঙ্গে সম্পর্কিত---তা বুঝে প্রয়োজন অনুযায়ী সঠিক
Hook ব্যবহার করা।
