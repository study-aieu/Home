import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Title, Paragraph, Button } from 'react-native-paper';

const PostsScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Title style={styles.title}>My Posts</Title>
      <Paragraph style={styles.text}>
        View and manage your published WordPress posts here.
      </Paragraph>
      <Button
        mode="contained"
        onPress={() => navigation.navigate('CreatePost')}
        style={styles.button}
      >
        Create New Post
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 16,
  },
  text: {
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.7,
  },
  button: {
    paddingHorizontal: 24,
  },
});

export default PostsScreen;