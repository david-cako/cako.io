---
title: "Understanding Rust"
date: "2017-02-11 23:54:32"
---

# Understanding Rust

<sup>2017-02-11</sup>

The Rust programming language is very unique in that it *forces* the developer to write memory-safe, type-safe, and thread-safe code.  This article aims to help users from any programming background understand the paradigms it puts forth and apply them effectively.

There are 4 principles you need to keep in mind when programming with Rust:

* Any variable which is not passed by reference is destroyed when passed into a function (it will no longer be accessible in the enclosing scope!)
* A variable may instead be passed by reference, or "borrowed", which will keep the original variable intact
* Either one mutable reference (`&mut foo`) or infinite immutable references (`&foo`) to a variable may exist at any given point in time
* Any type may disregard rule 1 entirely by implementing the [`Copy`](https://doc.rust-lang.org/std/marker/trait.Copy.html) trait (most primitive types do this!)

### Ownership

Rust's concept of ownership means that any variable which is passed into a containing scope is no longer accessible in the enclosing scope.

```
let a = Person {};

do_something(a); 
assert_eq!(a, Person {}); // false, a's ownership was transferred
```

### What are `trait`s?

Rust is a functional programming language, and many of the design patterns will seem very foreign to people familiar with modern object-oriented programming.  One of which is the concept of "traits".

In Rust, much like in C, structs are your primary source of object-oriented behavior.

Where in an OO language you are working with classes and methods:

```
class Person():
    age = 0;
    def birthday(self):
        self.age += 1
        return age
```
In Rust you are working with `struct`s and `impl`s:

```
struct Person {
    age: u8,
}

impl Person {
    fn birthday(&self) -> u8 {
        self.age += 1;
        self.age
    }
}
```

`trait`s are simply `impl`s that may be implemented differently on multiple types.  In this example, we can see the difference between implementing `Age` on our existing `Person` struct, and a new `Car` struct with a `model_year` field.

```
const CURRENT_YEAR: u16 = 2017;

struct Car {
    model_year: u16,
}

trait Age {
    fn age(&self) -> u8;
}

impl Age for Car {
    fn age(&self) -> u8 {
        // cars are usually manufactured one year earlier
        // than model year
        CURRENT_YEAR - self.model_year + 1
    }
}

impl Age for Person {
    fn age(&self) -> u8 {
        self.age
    }
}
```

### Borrowing and `Copy`ing

The built-in `Copy` trait may be implemented on your type as an alternative to the default `move` behavior.  When implemented, the type is now passed by value, and the original variable binding is retained.

This example demonstrates the difference between a type that implements `Copy` and one which doesn't:

```
let a = 5;
let b = Person{ age: 28 };

do_something_to(a);
do_something_to(b);

assert_eq!(a, 5);  // true
assert_eq!(b, Person{ age: 28 }); 
// false, b's ownership was transferred, and it is no longer accessible in the enclosing scope
```

This behavior is usually mitigated by passing a variable by reference:

```
let b = Person{ age: 28 };

do_something_to(&mut b);

assert_eq!(b, Person{ age: 28 }); 
// true, b was borrowed as a mutable reference, with ownership staying in the enclosing scope
```

But may also be mitigated by implementing `Copy` for your type:

```
#[derive(Copy, Clone)]
struct Car {
    ...
}
```

## Lifetimes

Lifetimes are easiest to think about as tags.  The letter you see is nothing more than a unique name for how long certain variables must exist.

The important thing to remember in understanding lifetimes is that **they are usually elided by the compiler.**  In fact, any time you *dont* explicitly declare a lifetime, it is being elided by the compiler.  This is helpful to think about because lifetimes are nothing more than explicit notation that helps the compiler understand which variables depend on the existence of other variables.

For example, in the following function, the compiler cannot infer which variables must continue to exist after the function exits.

```
fn do_stuff(foo: &i32, bar: &i32) -> &i32 {...}
```

Here, we make it clear to the compiler that the return value of `do_stuff` relies on the continued existence of `foo` (at least as long as the return value lives -- *the return value's lifetime*):

```
fn do_stuff<'a>(foo: &'a i32, bar: &i32) -> &'a i32 {...}
```

Lifetimes are important because the only way to return a reference from a function is by taking a reference as input and acting on it.  A reference created inside a function would be destroyed when the function exits.

Lifetimes also ensure that structs do not outlive their members:

```
struct Album<'a> {
    artist: &'a str,
    tracks: Vec<String>,
    year: u16,
}
```

Here, the lifetime `'a` guarantees that any instance of `Album` will not outlive the string slice that `Album.artist` points to.  Remember that `&str`s are unowned references (in the case of structs, to data owned by an enclosing scope), whereas `tracks` is a vector of `String`s, which are actually owned by the struct.