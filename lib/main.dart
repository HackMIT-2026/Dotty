import 'package:flutter/material.dart';
import 'pages/sign_in_page.dart';
import 'pages/home_page.dart';

void main() {
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Flutter SignIn + MongoDB',
      theme: ThemeData(primarySwatch: Colors.blue),
      initialRoute: '/signin',
      routes: {
        '/signin': (_) => SignInPage(),
        '/home': (_) => HomePage(),
      },
    );
  }
}
