'use client';
'use no memo';
import React, { useEffect, useState } from 'react';

const Banner = () => {
    const [count, setCount] = useState(0);

    const sayHello = () => {
      console.log('Hello');
  };
  
  console.log('Banner render হয়েছে');

    useEffect(() => {
      console.log('sayHello নতুন হয়েছে!');
    }, [sayHello]);
  return (
    <div>
      <button className='text-red-200 font-bold text-3xl' onClick={() => setCount(count + 1)}>Count: {count}</button>
    </div>
  );
};

export default Banner;