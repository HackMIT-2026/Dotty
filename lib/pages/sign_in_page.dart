import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class SignInPage extends StatefulWidget {
  @override
  _SignInPageState createState() => _SignInPageState();
}

class _SignInPageState extends State<SignInPage> {
  final _formKey = GlobalKey<FormState>();
  final TextEditingController _usernameController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  bool _loading = false;

  final String backendBase = 'http://localhost:3000';

  void _showMessage(String message, [Color? c]) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: c),
    );
  }

  Future<void> _submit(String route) async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _loading = true);

    final username = _usernameController.text.trim();
    final password = _passwordController.text;

    try {
      final res = await http.post(
        Uri.parse('$backendBase/$route'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'username': username, 'password': password}),
      );

      final body = jsonDecode(res.body);
      if (res.statusCode == 200) {
        _showMessage(body['message'] ?? 'Success', Colors.green);
        Navigator.of(context).pushReplacementNamed('/home');
      } else {
        _showMessage(body['error'] ?? 'Error', Colors.red);
      }
    } catch (e) {
      _showMessage('Network error: $e', Colors.red);
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Sign In')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              TextFormField(
                controller: _usernameController,
                decoration: const InputDecoration(labelText: 'Username'),
                validator: (v) => (v == null || v.trim().isEmpty) ? 'Enter username' : null,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _passwordController,
                decoration: const InputDecoration(labelText: 'Password'),
                obscureText: true,
                validator: (v) => (v == null || v.isEmpty) ? 'Enter password' : null,
              ),
              const SizedBox(height: 20),
              if (_loading) const CircularProgressIndicator(),
              if (!_loading)
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    ElevatedButton(onPressed: () => _submit('signup'), child: const Text('Sign Up')),
                    ElevatedButton(onPressed: () => _submit('login'), child: const Text('Login')),
                  ],
                ),
            ],
          ),
        ),
      ),
    );
  }
}
